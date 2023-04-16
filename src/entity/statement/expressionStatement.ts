import { CProgramContext } from '../../interpreter/cProgramContext'
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

  doExecute(env: Frame, context: CProgramContext): void {
    this.expression.evaluate(env, context)
  }

  override isTerminatingBlock(): boolean {
    return this.expression.isTerminatingBlock()
  }

  static parse(env: Frame, lexer: Lexer) {
    const expressionStatement = new ExpressionStatement(
      ExpressionParser.parse(env, lexer, true, false, null, false)
    )
    lexer.eatDelimiter(';')
    return [expressionStatement]
  }
}
