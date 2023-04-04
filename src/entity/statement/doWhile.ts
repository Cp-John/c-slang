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

export class DoWhile extends LoopStatement {
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
    returnType: DataType | null
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

  doExecute(env: Frame, context: CProgramContext): void {
    this.resetLoopCounter()
    do {
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
    } while ((this.condition.evaluate(env, context) as NumericLiteral).toBoolean())
  }
}
