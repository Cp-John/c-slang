import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { DataType } from '../datatype/dataType'
import { PrimitiveTypes } from '../datatype/primitiveType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { TerminatingStatement } from './simpleStatement'

export class Return extends TerminatingStatement {
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
    if (returnType != PrimitiveTypes.void) {
      if (lexer.matchDelimiter(';')) {
        throw new Error(lexer.formatError('non-void function should return a value'))
      }
      expression = ExpressionParser.parse(env, lexer, false, false, returnType, false)
    } else {
      if (!lexer.matchDelimiter('}') && !lexer.matchDelimiter(';')) {
        throw new Error(lexer.formatError('void function should not return a value'))
      }
    }
    lexer.eatDelimiter(';')
    return [new Return(returnType, expression)]
  }

  getEvaluated(): NumericLiteral | undefined {
    return this.evaluated
  }

  doExecute(env: Frame, context: CProgramContext): void {
    this.evaluated = this.expression?.evaluate(env, context)?.castToType(this.returnType)
    throw this
  }
}
