import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Statement } from './statement'

export class Break extends Statement {
  static parse(lexer: Lexer): Continue[] {
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return [new Break()]
  }

  execute(env: Frame, rts: Frame[]): void {
    throw new Error('Method not implemented.')
  }
}

export class Continue extends Statement {
  static parse(lexer: Lexer): [Continue] {
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return [new Continue()]
  }

  execute(env: Frame, rts: Frame[]): void {
    throw new Error('Method not implemented.')
  }
}
