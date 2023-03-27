import { DataType, PrimitiveType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { SelfDefinedFunction } from '../function/selfDefinedFunction'
import { Statement } from './statement'

export abstract class Declaration extends Statement {
  private static parseFormalParameterList(env: Frame, lexer: Lexer): [DataType, string][] {
    const result: [DataType, string][] = []
    lexer.eatDelimiter('(')
    if (lexer.matchKeyword('void')) {
      lexer.eatKeyword('void')
      lexer.eatDelimiter(')')
      return result
    }
    if (!lexer.matchDelimiter(')')) {
      const [typeRow, typeCol] = lexer.tell()
      const type = lexer.eatDataType()
      if (type == PrimitiveType.VOID) {
        throw new Error(lexer.formatError("argument may not have 'void' type", typeRow, typeCol))
      }
      const [row, col] = lexer.tell()
      const name = lexer.eatIdentifier()
      result.push([type, env.declare(name, type, row, col, lexer)])
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      const [typeRow, typeCol] = lexer.tell()
      const type = lexer.eatDataType()
      if (type == PrimitiveType.VOID) {
        throw new Error(lexer.formatError("argument may not have 'void' type", typeRow, typeCol))
      }
      const [row, col] = lexer.tell()
      const name = lexer.eatIdentifier()
      result.push([type, env.declare(name, type, row, col, lexer)])
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static parseDeclaredVariables(
    env: Frame,
    variableType: DataType,
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
      env.declare(declaredVariable, variableType, row, col, lexer)
      statements.push(new VariableDeclaration(variableType, declaredVariable, null))
    }
    if (lexer.matchDelimiter('[')) {
      throw new Error(lexer.formatError('array declaration is not supported, use malloc instead'))
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
      env.declare(identifier, PrimitiveType.FUNCTION, row, col, lexer)
      const newEnv = Frame.extend(env)
      const formalParameterList = Declaration.parseFormalParameterList(newEnv, lexer)
      const functionObj = new SelfDefinedFunction(type, identifier, formalParameterList, null)
      env.assignValue(identifier, functionObj)
      if (lexer.matchDelimiter('{')) {
        functionObj.body = Block.parse(newEnv, lexer, false, false, type)
      } else {
        lexer.eatDelimiter(';')
      }
      return [new FunctionDeclaration(type, identifier, formalParameterList, functionObj.body)]
    } else {
      if (type == PrimitiveType.VOID) {
        throw new Error(lexer.formatError("variable has incomplete type 'void'"))
      }
      env.declare(identifier, type, row, col, lexer)
      return this.parseDeclaredVariables(env, type, identifier, lexer)
    }
  }
}

class VariableDeclaration extends Declaration {
  private variableType: DataType
  private variableName: string
  expression: Expression | null

  constructor(variableType: DataType, variableName: string, expression: Expression | null) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.expression = expression
  }

  execute(env: Frame, rts: any[], context: any): void {
    env.declare(this.variableName, this.variableType)
    if (this.expression != null) {
      const val = this.expression.evaluate(env, rts, context)
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

  execute(env: Frame, rts: any[], context: any): void {
    env.declare(this.functionName, PrimitiveType.FUNCTION)
    env.assignValue(
      this.functionName,
      new SelfDefinedFunction(this.returnType, this.functionName, this.parameterList, this.body)
    )
  }
}
