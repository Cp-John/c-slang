import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

export class While extends Statement {
  private expression: Expression
  private body: Block

  constructor(expression: Expression, body: Block) {
    super()
    this.expression = expression
    this.body = body
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType
  ): While[] {
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(env, lexer, false, false, null)
    lexer.eatDelimiter(')')
    const body = Block.parse(env, lexer, true, true, returnType)
    return [new While(expression, body)]
  }

  execute(env: Frame, rts: any[], context: any): void {
    while ((this.expression.evaluate(env, rts, context) as NumericLiteral).getValue()) {
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
    }
  }
}
