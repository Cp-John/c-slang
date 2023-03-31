import { ArrayType, DataType, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
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
    const type = lexer.eatDataType()
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
      const type = lexer.eatDataType()
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
    variableType: PrimitiveType | PointerType,
    firstVariable: string,
    lexer: Lexer
  ): Statement[] {
    const statements: VariableDeclaration[] = [
      new VariableDeclaration(variableType, firstVariable, null)
    ]

    let declaredVariable = firstVariable
    while (true) {
      if (lexer.matchDelimiter('=')) {
        lexer.eatDelimiter('=')
        statements[statements.length - 1].expression = ExpressionParser.parse(
          env,
          lexer,
          false,
          false,
          variableType
        )
      }
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      const [row, col] = lexer.tell()
      declaredVariable = lexer.eatIdentifier()
      var actualType: DataType = variableType
      if (lexer.matchDelimiter('[')) {
        actualType = new ArrayType(variableType, lexer.eatArrayDimension())
      }
      env.declareVariable(declaredVariable, actualType, row, col, lexer)
      statements.push(new VariableDeclaration(variableType, declaredVariable, null))
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
    let type: DataType = PrimitiveType.VOID
    if (lexer.matchDataType()) {
      type = lexer.eatDataType()
    } else {
      throw new Error(lexer.formatError('declaration statement expected'))
    }
    const [row, col] = lexer.tell()
    const identifier = lexer.eatIdentifier()
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here'))
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
        throw new Error(lexer.formatError("variable has incomplete type 'void'"))
      }
      var actualType: DataType = type
      if (lexer.matchDelimiter('[')) {
        actualType = new ArrayType(type, lexer.eatArrayDimension())
      }
      env.declareVariable(identifier, actualType, row, col, lexer)
      return this.parseDeclaredVariables(env, type, identifier, lexer)
    }
  }
}

class ArrayDeclaration extends Declaration {
  private variableType: ArrayType
  private variableName: string
  private expressions: Expression[]

  constructor(variableType: ArrayType, variableName: string, expressions: Expression[]) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expressions = expressions
  }

  protected doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    const initialValues = []
    for (var i = 0; i < this.expressions.length; i++) {
      initialValues.push(this.expressions[i].evaluate(env, context))
    }
    env.initializeArray(this.variableName, initialValues)
  }
}

class VariableDeclaration extends Declaration {
  private variableType: PrimitiveType | PointerType
  private variableName: string
  expression: Expression | null

  constructor(variableType: PrimitiveType | PointerType, variableName: string, expression: Expression | null) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expression = expression
  }

  doExecute(env: Frame, context: CProgramContext): void {
    env.declareVariable(this.variableName, this.variableType)
    if (this.expression != null) {
      const val = this.expression.evaluate(env, context)
      if (val == undefined) {
        throw new Error('impossible execution path')
      }
      env.assignValue(this.variableName, val)
    }
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
