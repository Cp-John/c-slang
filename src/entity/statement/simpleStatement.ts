import { Lexer } from '../../parser/lexer'
import { Statement } from './statement'

export class Break extends Statement {
  static parse(lexer: Lexer): Continue {
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return new Break()
  }
}

export class Continue extends Statement {
  static parse(lexer: Lexer): Continue {
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return new Continue()
  }
}
