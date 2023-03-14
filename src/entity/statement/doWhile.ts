import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class DoWhile extends Statement {
  private body: Block
  private condition: Expression

  constructor(body: Block, condition: Expression) {
    super()
    this.body = body
    this.condition = condition
  }

  static parse(env: Frame, lexer: Lexer): DoWhile[] {
    lexer.eatKeyword('do')
    const body = Block.parse(env, lexer, true)
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const condition = ExpressionParser.parse(env, lexer)
    lexer.eatDelimiter(')')
    lexer.eatDelimiter(';')
    return [new DoWhile(body, condition)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    do {
      this.body.execute(env, rts, context)
    } while (this.condition.evaluate(env, rts, context) != 0)
  }
}
