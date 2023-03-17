import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

export class DoWhile extends Statement {
  private body: Block
  private condition: Expression

  constructor(body: Block, condition: Expression) {
    super()
    this.body = body
    this.condition = condition
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType
  ): DoWhile[] {
    lexer.eatKeyword('do')
    const body = Block.parse(env, lexer, true, true, returnType)
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const condition = ExpressionParser.parse(env, lexer, false, false, null)
    lexer.eatDelimiter(')')
    lexer.eatDelimiter(';')
    return [new DoWhile(body, condition)]
  }

  execute(env: Frame, rts: any[], context: any): void {
    do {
      try {
        this.body.execute(env, rts, context)
      } catch (err: any) {
        if (err == 'BREAK') {
          break
        } else if (err == 'CONTINUE') {
          continue
        } else {
          throw err
        }
      }
    } while ((this.condition.evaluate(env, rts, context) as NumericLiteral).toBoolean())
  }
}
