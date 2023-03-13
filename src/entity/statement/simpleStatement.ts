import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Statement } from './statement'

export class Break extends Statement {
  static parse(lexer: Lexer, isInLoop: boolean): Continue[] {
    if (!isInLoop) {
      throw new Error(lexer.formatError('break statement not in loop statement'))
    }
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return [new Break()]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    throw new Error('Method not implemented.')
  }
}

export class Continue extends Statement {
  static parse(lexer: Lexer, isInLoop: boolean): [Continue] {
    if (!isInLoop) {
      throw new Error(lexer.formatError('continue statement not in loop statement'))
    }
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return [new Continue()]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    throw new Error('Method not implemented.')
  }
}
