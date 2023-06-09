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
    returnType: DataType
  ): Continue[] {
    if (!allowBreak) {
      throw new Error(lexer.formatError('break statement not in loop statement'))
    }
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return [new Break()]
  }

  execute(env: Frame, rts: any[], context: any): void {
    throw 'BREAK'
  }
}

export class Continue extends Statement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType
  ): [Continue] {
    if (!allowContinue) {
      throw new Error(lexer.formatError('continue statement not in loop statement'))
    }
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return [new Continue()]
  }

  execute(env: Frame, rts: any[], context: any): void {
    throw 'CONTINUE'
  }
}
