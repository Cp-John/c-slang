import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { Statement } from './statement'

export class Assignment extends Statement {
  private variable: string
  private expression: Expression

  constructor(variable: string, expression: Expression) {
    super()
    this.variable = variable
    this.expression = expression
  }

  static parse(lexer: Lexer): Assignment[] {
    const variable = lexer.eatIdentifier()
    lexer.eatDelimiter('=')
    const expression = Expression.parse(lexer)
    lexer.eatDelimiter(';')
    return [new Assignment(variable, expression)]
  }
}
