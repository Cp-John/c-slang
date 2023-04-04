import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { DataType } from '../datatype/dataType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Declaration } from './declaration'
import { ExpressionStatement } from './expressionStatement'
import { LoopStatement } from './loopStatement'
import { Break, Continue } from './simpleStatement'

export class For extends LoopStatement {
  private init: (Declaration | ExpressionStatement)[]
  private condition: Expression | null
  private updation: ExpressionStatement | null
  private body: Block

  constructor(
    init: (Declaration | ExpressionStatement)[],
    condition: Expression | null,
    updation: ExpressionStatement | null,
    body: Block
  ) {
    super()
    this.init = init
    this.condition = condition
    this.updation = updation
    this.body = body
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): For[] {
    const forStatement = new For([], null, null, new Block([]))
    lexer.eatKeyword('for')
    lexer.eatDelimiter('(')
    const newEnv = Frame.extend(env)
    if (lexer.matchDelimiter(';')) {
      lexer.eatDelimiter(';')
    } else if (lexer.matchDataType()) {
      Declaration.parse(newEnv, lexer, false, false, returnType, false).forEach(statement =>
        forStatement.init.push(statement)
      )
    } else {
      ExpressionStatement.parse(newEnv, lexer).forEach(statement =>
        forStatement.init.push(statement)
      )
    }
    if (!lexer.matchDelimiter(';')) {
      forStatement.condition = ExpressionParser.parse(newEnv, lexer, false, false, null, true)
    }
    lexer.eatDelimiter(';')
    if (!lexer.matchDelimiter(')')) {
      forStatement.updation = new ExpressionStatement(
        ExpressionParser.parse(newEnv, lexer, true, false, null, false)
      )
    }
    lexer.eatDelimiter(')')
    forStatement.body = Block.parse(newEnv, lexer, true, true, returnType)
    return [forStatement]
  }

  doExecute(env: Frame, context: CProgramContext): void {
    const newEnv = Frame.extend(env)
    this.init.forEach(statement => statement.execute(newEnv, context))
    this.resetLoopCounter()
    while (
      this.condition == undefined ||
      (this.condition.evaluate(newEnv, context) as NumericLiteral).toBoolean()
    ) {
      this.incrementLoopCounter(context)
      try {
        this.body.execute(newEnv, context)
      } catch (err: any) {
        if (err instanceof Break) {
          break
        } else if (err instanceof Continue) {
          // do nothing
        } else {
          throw err
        }
      }
      this.updation?.execute(newEnv, context)
    }
  }
}
