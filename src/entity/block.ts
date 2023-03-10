import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Block {
  private content: (Statement | Block)[]

  constructor(content: (Statement | Block)[]) {
    this.content = content
  }

  static parse(lexer: Lexer): Block {
    lexer.eatDelimiter('{')
    const content = []
    while (!lexer.matchDelimiter('}')) {
      if (lexer.matchDelimiter('{')) {
        content.push(Block.parse(lexer))
      } else {
        content.push(Statement.parse(lexer))
      }
    }
    lexer.eatDelimiter('}')
    return new Block(content)
  }
}
