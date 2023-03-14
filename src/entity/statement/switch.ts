import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { Statement } from './statement'

class Case {
  private expression: Expression

  static parse(env: Frame, lexer: Lexer): Case {
    lexer.eatKeyword('case')
    const expr = ExpressionParser.parse(env, lexer, false, false, true)
    lexer.eatDelimiter(':')
    return new Case(expr)
  }

  evaluate(env: Frame, rts: Frame[], context: any) {
    return this.expression.evaluate(env, rts, context)
  }

  constructor(expression: Expression) {
    this.expression = expression
  }
}

export class Switch extends Statement {
  private expression: Expression
  private body: (Case | Statement | Block)[]

  constructor(expression: Expression, body: (Case | Statement | Block)[]) {
    super()
    this.expression = expression
    this.body = body
  }

  static parse(env: Frame, lexer: Lexer): Switch[] {
    lexer.eatKeyword('switch')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(env, lexer, false, false, false)
    lexer.eatDelimiter(')')
    lexer.eatDelimiter('{')
    const body = []
    while (!lexer.matchDelimiter('}')) {
      while (lexer.matchKeyword('case')) {
        body.push(Case.parse(env, lexer))
      }
      if (lexer.matchDelimiter('{')) {
        body.push(Block.parse(env, lexer, true))
      } else if (lexer.matchDataType()) {
        throw new Error(lexer.formatError('expected an expression'))
      } else {
        Statement.parse(env, lexer, true).forEach(statement => body.push(statement))
      }
    }
    lexer.eatDelimiter('}')
    return [new Switch(expression, body)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    const result = this.expression.evaluate(env, rts, context)
    let matched = false
    for (let i = 0; i < this.body.length; i++) {
      if (!matched && this.body[i] instanceof Case) {
        const toMatch = (this.body[i] as Case).evaluate(env, rts, context)
        matched = result == toMatch
      } else if (matched && !(this.body[i] instanceof Case)) {
        ;(this.body[i] as Statement | Block).execute(env, rts, context)
      }
    }
  }
}
