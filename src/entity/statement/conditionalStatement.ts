import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class ConditionalStatement extends Statement {
  private expression: Expression
  private ifBlock: Block
  private elseBlock: Block | undefined

  constructor(expression: Expression, ifBlock: Block, elseBlock: Block | undefined) {
    super()
    this.expression = expression
    this.ifBlock = ifBlock
    this.elseBlock = elseBlock
  }

  static parse(lexer: Lexer, isInLoop: boolean): ConditionalStatement[] {
    lexer.eatKeyword('if')
    lexer.eatDelimiter('(')
    const expr = ExpressionParser.parse(lexer)
    lexer.eatDelimiter(')')
    const ifBlock = Block.parse(lexer, isInLoop)
    if (!lexer.matchKeyword('else')) {
      return [new ConditionalStatement(expr, ifBlock, undefined)]
    }
    lexer.eatKeyword('else')
    const elseBlock = Block.parse(lexer, isInLoop)
    return [new ConditionalStatement(expr, ifBlock, elseBlock)]
  }

  execute(env: Frame, rts: Frame[]): void {
    if (this.expression.evaluate(env, rts) != 0) {
      this.ifBlock.execute(env, rts)
    } else {
      this.elseBlock?.execute(env, rts)
    }
  }
}
