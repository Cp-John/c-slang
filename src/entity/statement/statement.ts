export abstract class Statement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null,
    allowFunctionDeclaration: boolean = false
  ): Statement[] {
    if (lexer.matchKeyword('if')) {
      return ConditionalStatement.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('do')) {
      return DoWhile.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('while')) {
      return While.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('for')) {
      return For.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('switch')) {
      return Switch.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('return')) {
      return Return.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('continue')) {
      return Continue.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchKeyword('break')) {
      return Break.parse(env, lexer, allowBreak, allowContinue, returnType)
    } else if (lexer.matchDataType()) {
      return Declaration.parse(
        env,
        lexer,
        allowBreak,
        allowContinue,
        returnType,
        allowFunctionDeclaration
      )
    } else {
      return ExpressionStatement.parse(env, lexer)
    }
  }

  abstract execute(env: Frame, context: CProgramContext): void
}

import { DataType } from '../../interpreter/builtins'
import { CProgramContext } from '../../interpreter/cProgramContext'
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
