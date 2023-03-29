import { DataType, PrimitiveType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

export class Return extends Statement {
  private expression: Expression | null
  private evaluated: NumericLiteral | undefined
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
    returnType: DataType | null
  ): [Return] {
    if (returnType == null) {
      throw new Error(lexer.formatError('return statement not in function definition'))
    }
    lexer.eatKeyword('return')
    let expression = null
    if (lexer.matchDelimiter(';') && returnType != PrimitiveType.VOID) {
      throw new Error(lexer.formatError('non-void function should return a value'))
    } else if (!lexer.matchDelimiter(';') && returnType == PrimitiveType.VOID) {
      throw new Error(lexer.formatError('void function should not return a value'))
    }
    if (!lexer.matchDelimiter(';')) {
      expression = ExpressionParser.parse(env, lexer, false, false, returnType)
    }
    lexer.eatDelimiter(';')
    return [new Return(returnType, expression)]
  }

  getEvaluated(): NumericLiteral | undefined {
    return this.evaluated
  }

  execute(env: Frame, context: any): void {
    this.evaluated = this.expression?.evaluate(env, context)?.castToType(this.returnType)
    throw this
  }
}
