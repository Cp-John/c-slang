import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
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

  static parse(lexer: Lexer): ConditionalStatement[] {
    lexer.eatKeyword('if')
    lexer.eatDelimiter('(')
    const expr = Expression.parse(lexer)
    lexer.eatDelimiter(')')
    const ifBlock = Block.parse(lexer)
    if (!lexer.matchKeyword('else')) {
      return [new ConditionalStatement(expr, ifBlock, undefined)]
    }
    lexer.eatKeyword('else')
    const elseBlock = Block.parse(lexer)
    return [new ConditionalStatement(expr, ifBlock, elseBlock)]
  }
}
