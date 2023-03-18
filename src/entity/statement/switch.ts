import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Statement } from './statement'

class Case {
  private expression: Expression

  static parse(env: Frame, lexer: Lexer): Case {
    lexer.eatKeyword('case')
    const expr = ExpressionParser.parse(env, lexer, false, true, null)
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
  private defaultExecutables: (Statement | Block)[]
  private body: (Case | Statement | Block)[]

  constructor(
    expression: Expression,
    body: (Case | Statement | Block)[],
    defaultExecutables: (Statement | Block)[]
  ) {
    super()
    this.expression = expression
    this.body = body
    this.defaultExecutables = defaultExecutables
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType
  ): Switch[] {
    lexer.eatKeyword('switch')
    lexer.eatDelimiter('(')
    const expression = ExpressionParser.parse(env, lexer, false, false, null)
    lexer.eatDelimiter(')')
    lexer.eatDelimiter('{')
    const body = []
    let isInDefault = false
    const defaultExecutables: (Statement | Block)[] = []
    while (!lexer.matchDelimiter('}')) {
      if (lexer.matchKeyword('default')) {
        if (isInDefault) {
          throw new Error(lexer.formatError('multiple default labels in one switch'))
        }
        lexer.eatKeyword('default')
        lexer.eatDelimiter(':')
        isInDefault = true
      }
      while (lexer.matchKeyword('case')) {
        body.push(Case.parse(env, lexer))
      }
      if (lexer.matchDelimiter('{')) {
        const block = Block.parse(env, lexer, true, false, returnType)
        body.push(block)
        if (isInDefault) {
          defaultExecutables.push(block)
        }
      } else if (lexer.matchDataType()) {
        throw new Error(lexer.formatError('expected an expression'))
      } else {
        Statement.parse(env, lexer, true, false, returnType).forEach(statement => {
          body.push(statement)
          if (isInDefault) {
            defaultExecutables.push(statement)
          }
        })
      }
    }
    lexer.eatDelimiter('}')
    return [new Switch(expression, body, defaultExecutables)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    const result = (this.expression.evaluate(env, rts, context) as NumericLiteral).getValue()
    let matched = false
    for (let i = 0; i < this.body.length; i++) {
      try {
        if (!matched && this.body[i] instanceof Case) {
          const toMatch = (
            (this.body[i] as Case).evaluate(env, rts, context) as NumericLiteral
          ).getValue()
          matched = result == toMatch
        } else if (matched && !(this.body[i] instanceof Case)) {
          ;(this.body[i] as Statement | Block).execute(env, rts, context)
        }
      } catch (err: any) {
        if (err == 'BREAK') {
          return
        } else {
          throw err
        }
      }
    }
    if (!matched) {
      this.defaultExecutables.forEach(executable => executable.execute(env, rts, context))
    }
  }
}
