import { ArrayType, DataType, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { CProgramContext, initCProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { SelfDefinedFunction } from '../function/selfDefinedFunction'
import { Statement } from './statement'

function eatArrayDimension(env: Frame, lexer: Lexer): number[] {
  const result = []
  do {
    lexer.eatDelimiter('[')
    if (lexer.matchDelimiter(']')) {
      throw new Error(
        lexer.formatError('definition of variable with array type needs an explicit size')
      )
    }
    const [row, col] = lexer.tell()
    const size = ExpressionParser.parse(env, lexer, false, true, PrimitiveType.INT).evaluate(
      env,
      initCProgramContext(1000)
    ) as NumericLiteral
    if (size.getValue() <= 0) {
      throw new Error(lexer.formatError('declared as an array with a non-positive size', row, col))
    }
    result.push(size.getValue())
    lexer.eatDelimiter(']')
  } while (lexer.matchDelimiter('['))
  return result
}

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
    const type = lexer.wrapType(lexer.eatPrimitiveDataType())
    if (type == PrimitiveType.VOID) {
      lexer.eatDelimiter(')')
      return result
    }
    if (functionName == 'main') {
      throw new Error(lexer.formatError("expected no parameters on 'main' function declaration"))
    }
    let [row, col] = lexer.tell()
    let name = lexer.eatIdentifier()
    result.push([type, env.declareVariable(name, type, row, col, lexer)])
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      const [typeRow, typeCol] = lexer.tell()
      const type = lexer.wrapType(lexer.eatPrimitiveDataType())
      if (type == PrimitiveType.VOID) {
        throw new Error(lexer.formatError("argument may not have 'void' type", typeRow, typeCol))
      }
      ;[row, col] = lexer.tell()
      name = lexer.eatIdentifier()
      result.push([type, env.declareVariable(name, type, row, col, lexer)])
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static parseDeclaredVariables(
    env: Frame,
    primitiveType: PrimitiveType,
    firstVariableType: PrimitiveType | PointerType,
    firstVariable: string,
    firstRow: number,
    firstCol: number,
    lexer: Lexer
  ): Statement[] {
    const statements: (VariableDeclaration | ArrayDeclaration)[] = []
    if (lexer.matchDelimiter('[')) {
      const actualType = new ArrayType(firstVariableType, eatArrayDimension(env, lexer))
      env.declareVariable(firstVariable, actualType, firstRow, firstCol, lexer)
      statements.push(new ArrayDeclaration(actualType, firstVariable))
    } else {
      env.declareVariable(firstVariable, firstVariableType, firstRow, firstCol, lexer)
      statements.push(new VariableDeclaration(firstVariableType, firstVariable))
    }

    let declaredVariable = firstVariable
    while (true) {
      if (lexer.matchDelimiter('=')) {
        lexer.eatDelimiter('=')
        statements[statements.length - 1].parseExpression(env, lexer)
      }
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      let actualType: DataType = lexer.wrapType(primitiveType)
      const [row, col] = lexer.tell()
      declaredVariable = lexer.eatIdentifier()
      if (lexer.matchDelimiter('[')) {
        actualType = new ArrayType(actualType, eatArrayDimension(env, lexer))
        env.declareVariable(declaredVariable, actualType, row, col, lexer)
        statements.push(new ArrayDeclaration(actualType, declaredVariable))
      } else {
        env.declareVariable(declaredVariable, actualType, row, col, lexer)
        statements.push(new VariableDeclaration(actualType, declaredVariable))
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
    let primitiveType: PrimitiveType = PrimitiveType.VOID
    let type: DataType = PrimitiveType.VOID
    if (lexer.matchDataType()) {
      primitiveType = lexer.eatPrimitiveDataType()
      type = lexer.wrapType(primitiveType)
    } else {
      throw new Error(lexer.formatError('declaration statement expected'))
    }
    const [row, col] = lexer.tell()
    const identifier = lexer.eatIdentifier()
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here', row, col))
      }
      if (identifier == 'main' && type != PrimitiveType.VOID && type != PrimitiveType.INT) {
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
      if (type == PrimitiveType.VOID) {
        throw new Error(lexer.formatError("variable has incomplete type 'void'", row, col))
      }
      return this.parseDeclaredVariables(env, primitiveType, type, identifier, row, col, lexer)
    }
  }
}

class ArrayDeclaration extends Declaration {
  private variableType: ArrayType
  private variableName: string
  private expressions: Expression[]

  constructor(variableType: ArrayType, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expressions = []
  }

  parseExpression(env: Frame, lexer: Lexer): void {
    this.variableType.parseInitialArrayExpressions(env, lexer, this.expressions)
  }

  protected doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    const initialValues: NumericLiteral[] = []
    for (let i = 0; i < this.expressions.length; i++) {
      initialValues.push(this.expressions[i].evaluate(env, context) as NumericLiteral)
    }
    for (let i = initialValues.length; i < this.variableType.getEleCount(); i++) {
      initialValues.push(NumericLiteral.new(0).castToType(this.variableType.getEleType()))
    }
    env.initializeArray(this.variableName, initialValues)
  }
}

class VariableDeclaration extends Declaration {
  private variableType: PrimitiveType | PointerType
  private variableName: string
  expression: Expression | null

  constructor(variableType: PrimitiveType | PointerType, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expression = null
  }

  parseExpression(env: Frame, lexer: Lexer): void {
    this.expression = ExpressionParser.parse(env, lexer, false, false, this.variableType)
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

export class FunctionDeclaration extends Declaration {
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
