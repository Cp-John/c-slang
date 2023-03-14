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

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: string
  ): [Return] {
    lexer.eatKeyword('return')
    let expression = null
    if (lexer.matchDelimiter(';') && returnType != 'void') {
      throw new Error(lexer.formatError('non-void function should return a value'))
    } else if (!lexer.matchDelimiter(';') && returnType == 'void') {
      throw new Error(lexer.formatError('void function should not return a value'))
    }
    if (!lexer.matchDelimiter(';')) {
      expression = ExpressionParser.parse(env, lexer, false, false, false)
    }
    lexer.eatDelimiter(';')
    return [new Return(expression)]
  }

  execute(env: Frame, rts: any[], context: any): void {
    if (this.expression != null) {
      rts.push(this.expression.evaluate(env, rts, context))
    }
    throw 'RETURN'
  }
}
