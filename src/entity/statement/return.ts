import { DataType, Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

export class Return extends Statement {
  private expression: Expression | null
  private returnType: DataType

  private constructor(returnType: DataType, expression: Expression | null) {
    super()
    this.expression = expression
    this.returnType = returnType
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType
  ): [Return] {
    lexer.eatKeyword('return')
    let expression = null
    if (lexer.matchDelimiter(';') && returnType != DataType.VOID) {
      throw new Error(lexer.formatError('non-void function should return a value'))
    } else if (!lexer.matchDelimiter(';') && returnType == DataType.VOID) {
      throw new Error(lexer.formatError('void function should not return a value'))
    }
    if (!lexer.matchDelimiter(';')) {
      expression = ExpressionParser.parse(env, lexer, false, false, false)
    }
    lexer.eatDelimiter(';')
    return [new Return(returnType, expression)]
  }

  execute(env: Frame, rts: any[], context: any): void {
    if (this.expression == null) {
      throw 'RETURN'
    }
    rts.push(this.expression.evaluate(env, rts, context))
    if (this.returnType == DataType.INT) {
      ;(rts[rts.length - 1] as NumericLiteral).truncateDecimals()
    }
    throw 'RETURN'
  }
}
