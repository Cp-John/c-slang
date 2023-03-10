import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { Statement } from './statement'

export abstract class Declaration extends Statement {
  private static parseFormalParameterList(lexer: Lexer): [string, string][] {
    const result: [string, string][] = []
    lexer.eatDelimiter('(')
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

  static parse(lexer: Lexer): Declaration {
    const dataType = lexer.eatDataType()
    const identifier = lexer.eatIdentifier()
    if (lexer.matchDelimiter('(')) {
      return new FunctionDeclaration(
        dataType,
        identifier,
        Declaration.parseFormalParameterList(lexer),
        Block.parse(lexer)
      )
    } else {
      let initialValue: Expression | undefined = undefined
      if (!lexer.matchDelimiter(';')) {
        lexer.eatDelimiter('=')
        initialValue = Expression.parse(lexer)
      }
      lexer.eatDelimiter(';')
      return new VariableDeclaration(dataType, identifier, initialValue)
    }
  }
}

class VariableDeclaration extends Declaration {
  private variableType: string
  private variableName: string
  private initialValue: Expression | undefined

  constructor(
    variableType: string,
    variableName: string,
    initialValue: Expression | undefined = undefined
  ) {
    super()
    this.variableType = variableType
    this.variableName = variableName
    this.initialValue = initialValue
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
}
