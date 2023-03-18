import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class ExpressionStatement extends Statement {
  private expression: Expression

  constructor(expression: Expression) {
    super()
    this.expression = expression
  }

  execute(env: Frame, rts: any[], context: any): void {
    this.expression.evaluate(env, rts, context)
  }

  static parse(env: Frame, lexer: Lexer) {
    const expressionStatement = new ExpressionStatement(
      ExpressionParser.parse(env, lexer, true, false, null)
    )
    lexer.eatDelimiter(';')
    return [expressionStatement]
  }
}
