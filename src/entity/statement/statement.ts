export abstract class Statement {
  static parse(lexer: Lexer, isInLoop: boolean = false): Statement[] {
    if (lexer.matchKeyword('if')) {
      return ConditionalStatement.parse(lexer, isInLoop)
    } else if (lexer.matchKeyword('while')) {
      return While.parse(lexer)
    } else if (lexer.matchKeyword('for')) {
      return For.parse(lexer)
    } else if (lexer.matchKeyword('return')) {
      return Return.parse(lexer)
    } else if (lexer.matchKeyword('continue')) {
      return Continue.parse(lexer, isInLoop)
    } else if (lexer.matchKeyword('break')) {
      return Break.parse(lexer, isInLoop)
    } else if (lexer.matchDataType()) {
      return Declaration.parse(lexer)
    } else {
      return ExpressionStatement.parse(lexer)
    }
  }

  abstract execute(env: Frame, rts: Frame[], context: any): void
}

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { ConditionalStatement } from './conditionalStatement'
import { Declaration } from './declaration'
import { ExpressionStatement } from './expressionStatement'
import { For } from './for'
import { Return } from './return'
import { Break, Continue } from './simpleStatement'
import { While } from './while'
