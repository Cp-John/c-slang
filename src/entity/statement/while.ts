import { Frame } from '../../interpreter/frame'
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

  static parse(env: Frame, lexer: Lexer, isInLoop: boolean, returnType: string): While[] {
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(env, lexer, false, false, false)
    lexer.eatDelimiter(')')
    const body = Block.parse(env, lexer, true, returnType)
    return [new While(expression, body)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    while (this.expression.evaluate(env, rts, context) != 0) {
      this.body.execute(env, rts, context)
    }
  }
}
