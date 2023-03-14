import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Declaration } from './declaration'
import { ExpressionStatement } from './expressionStatement'
import { Statement } from './statement'

export class For extends Statement {
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
    returnType: string
  ): For[] {
    const forStatement = new For([], null, null, new Block([]))
    lexer.eatKeyword('for')
    lexer.eatDelimiter('(')
    if (lexer.matchDelimiter(';')) {
      lexer.eatDelimiter(';')
    } else if (lexer.matchDataType()) {
      Declaration.parse(env, lexer, false, false, returnType, false).forEach(statement =>
        forStatement.init.push(statement)
      )
    } else {
      ExpressionStatement.parse(env, lexer).forEach(statement => forStatement.init.push(statement))
    }
    if (!lexer.matchDelimiter(';')) {
      forStatement.condition = ExpressionParser.parse(env, lexer, false, false, false)
    }
    lexer.eatDelimiter(';')
    if (!lexer.matchDelimiter(')')) {
      forStatement.updation = new ExpressionStatement(
        ExpressionParser.parse(env, lexer, false, true, false)
      )
    }
    lexer.eatDelimiter(')')
    forStatement.body = Block.parse(env, lexer, true, true, returnType)
    return [forStatement]
  }

  execute(env: Frame, rts: any[], context: any): void {
    const newEnv = Frame.extend(env)
    this.init.forEach(statement => statement.execute(newEnv, rts, context))
    while (this.condition?.evaluate(newEnv, rts, context) != 0) {
      try {
        this.body.execute(newEnv, rts, context)
      } catch (err: any) {
        if (err == 'BREAK') {
          break
        } else if (err == 'CONTINUE') {
          // do nothing
        } else {
          throw err
        }
      }
      this.updation?.execute(newEnv, rts, context)
    }
  }
}
