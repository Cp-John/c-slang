import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Statement } from './statement'

export class Break extends Statement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): Continue[] {
    if (!allowBreak) {
      throw new Error(lexer.formatError('break statement not in loop statement'))
    }
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return [new Break()]
  }

  execute(env: Frame, context: any): void {
    throw this
  }
}

export class Continue extends Statement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): [Continue] {
    if (!allowContinue) {
      throw new Error(lexer.formatError('continue statement not in loop statement'))
    }
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return [new Continue()]
  }

  execute(env: Frame, context: any): void {
    throw this
  }
}
