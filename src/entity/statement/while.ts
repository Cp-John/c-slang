import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class While extends Statement {
  private expression: Expression
  private body: Block

  constructor(expression: Expression, body: Block) {
    super()
    this.expression = expression
    this.body = body
  }

  static parse(lexer: Lexer): While[] {
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(lexer)
    lexer.eatDelimiter(')')
    const body = Block.parse(lexer)
    return [new While(expression, body)]
  }
}
