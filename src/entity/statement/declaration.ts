import { LexerActionExecutor } from 'antlr4ts/atn/LexerActionExecutor'

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { ExpressionParser } from '../expression/expressionParser'
import { SelfDefinedFunction } from '../function/selfDefinedFunction'
import { Assignment } from './assignment'
import { Statement } from './statement'

export abstract class Declaration extends Statement {
  private static parseFormalParameterList(lexer: Lexer): [string, string][] {
    const result: [string, string][] = []
    lexer.eatDelimiter('(')
    if (lexer.matchKeyword('void')) {
      lexer.eatKeyword('void')
      lexer.eatDelimiter(')')
      return result
    }
    if (!lexer.matchDelimiter(')')) {
      result.push([lexer.eatDataType(), lexer.eatIdentifier()])
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push([lexer.eatDataType(), lexer.eatIdentifier()])
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static parseDeclaredVariables(
    dataType: string,
    firstVariable: string,
    lexer: Lexer
  ): Statement[] {
    const statements: Statement[] = [new VariableDeclaration(dataType, firstVariable)]

    let declaredVariable = firstVariable
    while (true) {
      if (lexer.matchDelimiter('=')) {
        lexer.eatDelimiter('=')
        statements.push(new Assignment(declaredVariable, '=', ExpressionParser.parse(lexer)))
      }
      if (!lexer.matchDelimiter(',')) {
        break
      }
      lexer.eatDelimiter(',')
      declaredVariable = lexer.eatIdentifier()
      statements.push(new VariableDeclaration(dataType, declaredVariable))
    }
    lexer.eatDelimiter(';')
    return statements
  }

  static parse(lexer: Lexer, allowFunctionDeclaration: boolean = false): Statement[] {
    let type
    if (lexer.matchKeyword('void')) {
      type = lexer.eatKeyword('void')
    } else {
      type = lexer.eatDataType()
    }
    const identifier = lexer.eatIdentifier()
    if (lexer.matchDelimiter('(')) {
      if (!allowFunctionDeclaration) {
        throw new Error(lexer.formatError('function definition is not allowed here'))
      }
      return [
        new FunctionDeclaration(
          type,
          identifier,
          Declaration.parseFormalParameterList(lexer),
          Block.parse(lexer, false)
        )
      ]
    } else {
      if (type == 'void') {
        throw new Error(lexer.formatError("variable has incomplete type 'void'"))
      }
      return this.parseDeclaredVariables(type, identifier, lexer)
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

  execute(env: Frame, rts: Frame[]): void {
    env.declare(this.variableName)
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

  execute(env: Frame, rts: Frame[]): void {
    env.declare(this.functionName)
    env.assignValue(
      this.functionName,
      new SelfDefinedFunction(this.returnType, this.functionName, this.parameterList, this.body)
    )
  }
}
