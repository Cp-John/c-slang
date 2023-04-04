import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { DataType } from '../datatype/dataType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

export class ConditionalStatement extends Statement {
  private ifBlocks: [Expression, Block][]
  private elseBlock: Block | undefined

  constructor(ifBlocks: [Expression, Block][], elseBlock: Block | undefined) {
    super()
    this.ifBlocks = ifBlocks
    this.elseBlock = elseBlock
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): ConditionalStatement[] {
    const ifBlocks: [Expression, Block][] = []
    let hasElseBlock = true
    while (true) {
      lexer.eatKeyword('if')
      lexer.eatDelimiter('(')
      const expr = ExpressionParser.parse(env, lexer, false, false, null, true)
      lexer.eatDelimiter(')')
      const ifBlock = Block.parse(env, lexer, allowBreak, allowContinue, returnType)
      ifBlocks.push([expr, ifBlock])
      if (!lexer.matchKeyword('else')) {
        hasElseBlock = false
        break
      }
      lexer.eatKeyword('else')
      if (!lexer.matchKeyword('if')) {
        break
      }
    }
    let elseBlock = undefined
    if (hasElseBlock) {
      elseBlock = Block.parse(env, lexer, allowBreak, allowContinue, returnType)
    }
    return [new ConditionalStatement(ifBlocks, elseBlock)]
  }

  doExecute(env: Frame, context: CProgramContext): void {
    let executed = false
    for (const [expr, body] of this.ifBlocks) {
      if ((expr.evaluate(env, context) as NumericLiteral).toBoolean()) {
        body.execute(env, context)
        executed = true
        break
      }
    }
    if (!executed) {
      this.elseBlock?.execute(env, context)
    }
  }
}
