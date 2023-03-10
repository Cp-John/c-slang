import { Lexer } from '../../parser/lexer'
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
        Declaration.parseFormalParameterList(lexer)
      )
    } else {
      lexer.eatDelimiter(';')
      return new VariableDeclaration(dataType, identifier)
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
}

export class FunctionDeclaration extends Declaration {
  private returnType: string
  private functionName: string
  private parameterList: [string, string][]

  constructor(returnType: string, functionName: string, parameterList: [string, string][]) {
    super()
    this.returnType = returnType
    this.functionName = functionName
    this.parameterList = parameterList
  }
}
