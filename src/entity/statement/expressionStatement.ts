import { Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'
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
}
