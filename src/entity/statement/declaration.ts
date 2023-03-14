import { Frame, VariableType } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { ExpressionParser } from '../expression/expressionParser'
import { SelfDefinedFunction } from '../function/selfDefinedFunction'
import { ExpressionStatement } from './expressionStatement'
import { Statement } from './statement'

export abstract class Declaration extends Statement {
  private static parseFormalParameterList(env: Frame, lexer: Lexer): [string, string][] {
    const result: [string, string][] = []
    lexer.eatDelimiter('(')
    if (lexer.matchKeyword('void')) {
      lexer.eatKeyword('void')
      lexer.eatDelimiter(')')
      return result
    }
    if (!lexer.matchDelimiter(')')) {
      result.push([lexer.eatDataType(), env.declare(lexer, VariableType.NUMBER)])
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push([lexer.eatDataType(), env.declare(lexer, VariableType.NUMBER)])
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static parseDeclaredVariables(
    env: Frame,
    dataType: string,
    firstVariable: string,
    lexer: Lexer
  ): Statement[] {
    const statements: Statement[] = [new VariableDeclaration(dataType, firstVariable)]

    let declaredVariable = firstVariable
    while (true) {
      if (lexer.matchDelimiter('=')) {
        lexer.eatDelimiter('=')
        statements.push(
          new ExpressionStatement(
            ExpressionParser.parse(env, lexer, false, false, false).assignTo(declaredVariable)
          )
        )
      }
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      declaredVariable = env.declare(lexer, VariableType.NUMBER)
      statements.push(new VariableDeclaration(dataType, declaredVariable))
    }
    lexer.eatDelimiter(';')
    return statements
  }

  static parse(env: Frame, lexer: Lexer, allowFunctionDeclaration: boolean = false): Statement[] {
    let type
    if (lexer.matchKeyword('void')) {
      type = lexer.eatKeyword('void')
    } else {
      type = lexer.eatDataType()
    }
    const identifier = env.declare(lexer, VariableType.NUMBER)
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here'))
      }
      env.markType(identifier, VariableType.FUNCTION)
      const newEnv = Frame.extend(env)
      const formalParameterList = Declaration.parseFormalParameterList(newEnv, lexer)
      const functionBody = Block.parse(newEnv, lexer, false)
      env.assignValue(
        identifier,
        new SelfDefinedFunction(type, identifier, formalParameterList, functionBody)
      )
      return [new FunctionDeclaration(type, identifier, formalParameterList, functionBody)]
    } else {
      if (type == 'void') {
        throw new Error(lexer.formatError("variable has incomplete type 'void'"))
      }
      return this.parseDeclaredVariables(env, type, identifier, lexer)
    }
  }
}

class VariableDeclaration extends Declaration {
  private variableType: string
  private variableName: string

  constructor(variableType: string, variableName: string) {
    super()
    this.variableType = variableType
    this.variableName = variableName
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    env.declare(this.variableName, VariableType.NUMBER)
  }
}

export class FunctionDeclaration extends Declaration {
  private returnType: string
  private functionName: string
  private parameterList: [string, string][]
  private body: Block

  constructor(
    returnType: string,
    functionName: string,
    parameterList: [string, string][],
    body: Block
  ) {
    super()
    this.returnType = returnType
    this.functionName = functionName
    this.parameterList = parameterList
    this.body = body
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    env.declare(this.functionName, VariableType.FUNCTION)
    env.assignValue(
      this.functionName,
      new SelfDefinedFunction(this.returnType, this.functionName, this.parameterList, this.body)
    )
  }
}
