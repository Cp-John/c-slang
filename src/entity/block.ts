import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Block {
  private body: (Statement | Block)[]

  constructor(body: (Statement | Block)[]) {
    this.body = body
  }

  static parse(lexer: Lexer): Block {
    lexer.eatDelimiter('{')
    const body = []
    while (!lexer.matchDelimiter('}')) {
      if (lexer.matchDelimiter('{')) {
        body.push(Block.parse(lexer))
      } else {
        body.push(Statement.parse(lexer))
      }
    }
    lexer.eatDelimiter('}')
    return new Block(body)
  }
}
