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

  execute(env: Frame, rts: Frame[], context: any): void {
    this.expression.evaluate(env, rts, context)
  }

  static parse(lexer: Lexer) {
    const expressionStatement = new ExpressionStatement(ExpressionParser.parse(lexer))
    lexer.eatDelimiter(';')
    return [expressionStatement]
  }
}
