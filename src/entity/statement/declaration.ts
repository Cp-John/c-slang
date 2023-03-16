import { DataType } from '../../interpreter/builtins'
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
      const type = lexer.eatDataType()
      result.push([type, env.declare(lexer, type)])
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      const type = lexer.eatDataType()
      result.push([type, env.declare(lexer, type)])
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
          false
        )
      }
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      declaredVariable = env.declare(lexer, variableType)
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
    returnType: DataType,
    allowFunctionDeclaration: boolean = false
  ): Statement[] {
    let type = DataType.VOID
    if (lexer.matchKeyword('void')) {
      lexer.eatKeyword('void')
    } else if (lexer.matchDataType()) {
      type = lexer.eatDataType()
    } else {
      throw new Error(lexer.formatError('declaration statement expected'))
    }
    const identifier = env.declare(lexer, type)
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here'))
      }
      env.markType(identifier, DataType.FUNCTION)
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
      if (type == 'void') {
        throw new Error(lexer.formatError("variable has incomplete type 'void'"))
      }
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
      if (val == undefined || typeof val == 'string') {
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
    env.declare(this.functionName, DataType.FUNCTION)
    env.assignValue(
      this.functionName,
      new SelfDefinedFunction(this.returnType, this.functionName, this.parameterList, this.body)
    )
    console.log(env)
  }
}
