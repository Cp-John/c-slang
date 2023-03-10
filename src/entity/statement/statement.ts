export abstract class Statement {
  static parseExpressionOrAssignment(lexer: Lexer): Expression | Assignment {
    const expr = Expression.parse(lexer)
    if (expr.isIdentifier() && lexer.matchDelimiter('=')) {
      lexer.eatDelimiter('=')
      const right = Expression.parse(lexer)
      lexer.eatDelimiter(';')
      return new Assignment(expr.toIdentifier(), right)
    } else {
      lexer.eatDelimiter(';')
      return expr
    }
  }

  static parse(lexer: Lexer): Statement {
    if (lexer.matchKeyword('while')) {
      return While.parse(lexer)
    } else if (lexer.matchKeyword('return')) {
      return Return.parse(lexer)
    } else if (lexer.matchKeyword('continue')) {
      return Continue.parse(lexer)
    } else if (lexer.matchKeyword('break')) {
      return Break.parse(lexer)
    } else if (lexer.matchDataType()) {
      return Declaration.parse(lexer)
    } else {
      return this.parseExpressionOrAssignment(lexer)
    }
  }
}

import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { Assignment } from './assignment'
import { Declaration } from './declaration'
import { Return } from './return'
import { Break, Continue } from './simpleStatement'
import { While } from './while'
