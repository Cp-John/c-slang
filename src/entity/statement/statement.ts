export abstract class Statement {
  static parseExpressionOrAssignment(lexer: Lexer): ExpressionStatement | Assignment {
    const expr = ExpressionParser.parse(lexer)
    if (expr.isIdentifier() && lexer.matchAssignmentOperator()) {
      const opr = lexer.eatAssignmentOperator()
      const right = ExpressionParser.parse(lexer)
      lexer.eatDelimiter(';')
      return new Assignment(expr.toIdentifier(), opr, right)
    } else {
      lexer.eatDelimiter(';')
      return new ExpressionStatement(expr)
    }
  }

  static parse(lexer: Lexer): Statement[] {
    if (lexer.matchKeyword('if')) {
      return ConditionalStatement.parse(lexer)
    } else if (lexer.matchKeyword('while')) {
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
      return [this.parseExpressionOrAssignment(lexer)]
    }
  }

  abstract execute(env: Frame, rts: Frame[]): void
}

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { ExpressionParser } from '../expression/expressionParser'
import { Assignment } from './assignment'
import { ConditionalStatement } from './conditionalStatement'
import { Declaration } from './declaration'
import { ExpressionStatement } from './expressionStatement'
import { Return } from './return'
import { Break, Continue } from './simpleStatement'
import { While } from './while'
