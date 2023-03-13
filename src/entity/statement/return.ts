import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

export class Return extends Statement {
  private expression: Expression | null

  constructor(expression: Expression | null) {
    super()
    this.expression = expression
  }

  static parse(lexer: Lexer): [Return] {
    lexer.eatKeyword('return')
    let expression = null
    if (!lexer.matchDelimiter(';')) {
      expression = ExpressionParser.parse(lexer)
    }
    lexer.eatDelimiter(';')
    return [new Return(expression)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    this.expression?.evaluate(env, rts, context)
  }
}
