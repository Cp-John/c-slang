import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
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
      forStatement.condition = ExpressionParser.parse(newEnv, lexer, false, false, null)
    }
    lexer.eatDelimiter(';')
    if (!lexer.matchDelimiter(')')) {
      forStatement.updation = new ExpressionStatement(
        ExpressionParser.parse(newEnv, lexer, true, false, null)
      )
    }
    lexer.eatDelimiter(')')
    forStatement.body = Block.parse(newEnv, lexer, true, true, returnType)
    return [forStatement]
  }

  execute(env: Frame, context: any): void {
    const newEnv = Frame.extend(env)
    this.init.forEach(statement => statement.execute(newEnv, context))
    while (
      this.condition == undefined ||
      (this.condition.evaluate(newEnv, context) as NumericLiteral).toBoolean()
    ) {
      try {
        this.body.execute(newEnv, context)
      } catch (err: any) {
        if (err == 'BREAK') {
          break
        } else if (err == 'CONTINUE') {
          // do nothing
        } else {
          throw err
        }
      }
      this.updation?.execute(newEnv, context)
    }
  }
}
