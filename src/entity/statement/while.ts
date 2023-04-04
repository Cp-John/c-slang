import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { DataType } from '../datatype/dataType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { LoopStatement } from './loopStatement'
import { Break, Continue } from './simpleStatement'

export class While extends LoopStatement {
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
    returnType: DataType | null
  ): While[] {
    lexer.eatKeyword('while')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(env, lexer, false, false, null)
    lexer.eatDelimiter(')')
    const body = Block.parse(env, lexer, true, true, returnType)
    return [new While(expression, body)]
  }

  doExecute(env: Frame, context: CProgramContext): void {
    this.resetLoopCounter()
    while ((this.expression.evaluate(env, context) as NumericLiteral).toBoolean()) {
      this.incrementLoopCounter(context)
      try {
        this.body.execute(env, context)
      } catch (err: any) {
        if (err instanceof Break) {
          break
        } else if (err instanceof Continue) {
          continue
        } else {
          throw err
        }
      }
    }
  }
}
