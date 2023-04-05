import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { ArrayType, ElementType, NonPointerLikeType } from '../datatype/arrayType'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../datatype/primitiveType'
import { StructType } from '../datatype/structType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { SelfDefinedFunction } from '../function/selfDefinedFunction'
import { Statement } from './statement'

export abstract class Declaration extends Statement {
  private static parseFormalParameterList(
    env: Frame,
    lexer: Lexer,
    functionName: string
  ): [DataType, string][] {
    const result: [DataType, string][] = []
    lexer.eatDelimiter('(')
    if (!lexer.matchDataType()) {
      lexer.eatDelimiter(')')
      return result
    }
    let type: ElementType = lexer.eatElementType(env)
    if (type == PrimitiveTypes.void) {
      lexer.eatDelimiter(')')
      return result
    }
    if (functionName == 'main') {
      throw new Error(lexer.formatError("expected no parameters on 'main' function declaration"))
    }
    let [row, col] = lexer.tell()
    let name = lexer.eatIdentifier()
    if (lexer.matchDelimiter('[')) {
      type = ArrayType.wrap(env, lexer, type, true).toPointerType()
    }
    result.push([type, env.declareVariable(name, type, row, col, lexer)])
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      const [typeRow, typeCol] = lexer.tell()
      type = lexer.eatElementType(env)
      if (type == PrimitiveTypes.void) {
        throw new Error(lexer.formatError("argument may not have 'void' type", typeRow, typeCol))
      }
      ;[row, col] = lexer.tell()
      name = lexer.eatIdentifier()
      if (lexer.matchDelimiter('[')) {
        type = ArrayType.wrap(env, lexer, type, true).toPointerType()
      }
      result.push([type, env.declareVariable(name, type, row, col, lexer)])
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static parseDeclaredVariables(
    env: Frame,
    nonPointerLikeType: NonPointerLikeType,
    firstVariableType: ElementType,
    firstVariable: string,
    firstRow: number,
    firstCol: number,
    lexer: Lexer
  ): Statement[] {
    const statements: (VariableDeclaration | ArrayDeclaration | StructDeclaration)[] = []
    let actualType: DataType = firstVariableType
    if (lexer.matchDelimiter('[')) {
      actualType = ArrayType.wrap(env, lexer, firstVariableType, true)
      statements.push(new ArrayDeclaration(actualType as ArrayType, firstVariable))
    } else if (firstVariableType instanceof StructType) {
      statements.push(new StructDeclaration(firstVariableType, firstVariable))
    } else {
      statements.push(new VariableDeclaration(firstVariableType, firstVariable))
    }

    let [row, col] = [firstRow, firstCol]

    let declaredVariable = firstVariable
    while (true) {
      if (lexer.matchDelimiter('=')) {
        lexer.eatDelimiter('=')
        statements[statements.length - 1].parseExpression(env, lexer)
      }
      if (!actualType.isComplete()) {
        throw new Error(lexer.formatError('variable has incomplete type', row, col))
      }
      env.declareVariable(declaredVariable, actualType, row, col, lexer)
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      actualType = lexer.wrapType(nonPointerLikeType)
      row = lexer.tell()[0]
      col = lexer.tell()[1]
      declaredVariable = lexer.eatIdentifier()
      if (lexer.matchDelimiter('[')) {
        actualType = ArrayType.wrap(env, lexer, actualType as ElementType, true)
        statements.push(new ArrayDeclaration(actualType as ArrayType, declaredVariable))
      } else if (actualType instanceof StructType) {
        statements.push(new StructDeclaration(actualType, declaredVariable))
      } else {
        statements.push(
          new VariableDeclaration(actualType as PointerType | PrimitiveType, declaredVariable)
        )
      }
    }
    lexer.eatDelimiter(';')
    return statements
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null,
    allowFunctionDeclaration: boolean
  ): Statement[] {
    const [typeRow, typeCol] = lexer.tell()
    let nonPointerLikeType: NonPointerLikeType = PrimitiveTypes.void
    let type: ElementType = PrimitiveTypes.void
    if (lexer.matchDataType()) {
      if (lexer.matchKeyword('struct')) {
        lexer.eatKeyword('struct')
        const tag = lexer.eatIdentifier()
        if (lexer.matchDelimiter('{')) {
          const structType = StructType.getIncomplete(tag)
          env.declareStructType(structType)
          structType.parseDefinitionBody(env, lexer)
          lexer.eatDelimiter(';')
          return [new StructTypeDeclaration(structType)]
        } else {
          nonPointerLikeType = env.lookupStructType('struct ' + tag, typeRow, typeCol, lexer)
        }
      } else {
        nonPointerLikeType = lexer.eatNonPointerLikeType(env)
      }
      type = lexer.wrapType(nonPointerLikeType)
    } else {
      throw new Error(lexer.formatError('declaration statement expected'))
    }
    const [row, col] = lexer.tell()
    const identifier = lexer.eatIdentifier()
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here', row, col))
      }
      if (identifier == 'main' && type != PrimitiveTypes.void && type != PrimitiveTypes.int) {
        throw new Error(
          lexer.formatError(
            "return type of 'main' function is not 'int' or 'void'",
            typeRow,
            typeCol
          )
        )
      }
      const newEnv = Frame.extend(env)
      const formalParameterList = Declaration.parseFormalParameterList(newEnv, lexer, identifier)
      const functionObj = new SelfDefinedFunction(type, identifier, formalParameterList, null)
      env.declareFunction(identifier, functionObj, row, col, lexer)
      if (lexer.matchDelimiter('{')) {
        functionObj.body = Block.parse(newEnv, lexer, false, false, type, true)
      } else {
        lexer.eatDelimiter(';')
      }
      return [new FunctionDeclaration(type, identifier, formalParameterList, functionObj.body)]
    } else {
      if (type == PrimitiveTypes.void) {
        throw new Error(lexer.formatError("variable has incomplete type 'void'", row, col))
      }
      return this.parseDeclaredVariables(env, nonPointerLikeType, type, identifier, row, col, lexer)
    }
  }
}

class ArrayDeclaration extends Declaration {
  private variableType: ArrayType
  private variableName: string
  private expressions: Expression[] | null

  constructor(variableType: ArrayType, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expressions = null
  }

  parseExpression(env: Frame, lexer: Lexer): void {
    this.expressions = []
    this.variableType.parseInitialArrayExpressions(env, lexer, this.expressions)
  }

  protected doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    if (this.expressions == null) {
      this.expressions = this.variableType.defaultInitialExpressions()
    }
    const initialValues: NumericLiteral[] = []
    this.expressions.forEach(expr =>
      initialValues.push(expr.evaluate(env, context) as NumericLiteral)
    )
    env.initializeArray(this.variableName, initialValues)
  }
}

class StructDeclaration extends Declaration {
  private variableType: StructType
  private variableName: string
  private expressions: Expression[] | null
  private toCopy: Expression | null

  constructor(variableType: StructType, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expressions = null
    this.toCopy = null
  }

  parseExpression(env: Frame, lexer: Lexer): void {
    if (lexer.matchDelimiter('{')) {
      this.expressions = this.variableType.parseInitialExpressions(env, lexer)
    } else {
      this.toCopy = ExpressionParser.parse(env, lexer, false, false, this.variableType, false)
    }
  }

  doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    if (this.toCopy != null) {
      env.assignValue(this.variableName, this.toCopy.evaluate(env, context) as NumericLiteral)
    } else {
      const initialValues: NumericLiteral[] = []
      this.expressions =
        this.expressions == null ? this.variableType.defaultInitialExpressions() : this.expressions
      this.expressions.forEach(expr =>
        initialValues.push(expr.evaluate(env, context) as NumericLiteral)
      )
      env.initializeStruct(this.variableName, initialValues)
    }
  }
}

class VariableDeclaration extends Declaration {
  private variableType: PointerType | PrimitiveType
  private variableName: string
  expression: Expression | null

  constructor(variableType: PointerType | PrimitiveType, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expression = null
  }

  parseExpression(env: Frame, lexer: Lexer): void {
    this.expression = ExpressionParser.parse(env, lexer, false, false, this.variableType, false)
  }

  doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    let val: NumericLiteral
    if (this.expression != null) {
      val = this.expression.evaluate(env, context) as NumericLiteral
    } else {
      val = NumericLiteral.new(0).castToType(this.variableType)
    }
    env.assignValue(this.variableName, val)
  }
}

class StructTypeDeclaration extends Declaration {
  private structType: StructType

  constructor(structType: StructType) {
    super()
    this.structType = structType
  }

  protected doExecute(env: Frame, context: CProgramContext): void {
    env.declareStructType(this.structType)
  }
}

class FunctionDeclaration extends Declaration {
  private returnType: DataType
  private functionName: string
  private parameterList: [DataType, string][]
  private body: Block | null

  constructor(
    returnType: DataType,
    functionName: string,
    parameterList: [DataType, string][],
    body: Block | null
  ) {
    super()
    this.returnType = returnType
    this.functionName = functionName
    this.parameterList = parameterList
    this.body = body
  }

  doExecute(env: Frame, context: CProgramContext): void {
    env.declareFunction(
      this.functionName,
      new SelfDefinedFunction(this.returnType, this.functionName, this.parameterList, this.body)
    )
  }
}
