export abstract class Statement {
  static parse(env: Frame, lexer: Lexer, isInLoop: boolean, returnType: string): Statement[] {
    if (lexer.matchKeyword('if')) {
      return ConditionalStatement.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('do')) {
      return DoWhile.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('while')) {
      return While.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('for')) {
      return For.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('switch')) {
      return Switch.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('return')) {
      return Return.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('continue')) {
      return Continue.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchKeyword('break')) {
      return Break.parse(env, lexer, isInLoop, returnType)
    } else if (lexer.matchDataType()) {
      return Declaration.parse(env, lexer, isInLoop, returnType, false)
    } else {
      return ExpressionStatement.parse(env, lexer)
    }
  }

  abstract execute(env: Frame, rts: Frame[], context: any): void
}

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { ConditionalStatement } from './conditionalStatement'
import { Declaration } from './declaration'
import { DoWhile } from './doWhile'
import { ExpressionStatement } from './expressionStatement'
import { For } from './for'
import { Return } from './return'
import { Break, Continue } from './simpleStatement'
import { Switch } from './switch'
import { While } from './while'
