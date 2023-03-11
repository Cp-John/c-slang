import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class Return extends Statement {
  private expression: Expression

  constructor(expression: Expression) {
    super()
    this.expression = expression
  }

  static parse(lexer: Lexer): [Return] {
    lexer.eatKeyword('return')
    const expression = ExpressionParser.parse(lexer)
    lexer.eatDelimiter(';')
    return [new Return(expression)]
  }
}
