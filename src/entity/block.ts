import { Declaration } from 'estree'

import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Block {
  private content: (Statement | Block)[]

  constructor(content: (Statement | Block)[]) {
    this.content = content
  }

  static parse(lexer: Lexer): Block {
    lexer.eatDelimiter('{')
    const content: (Block | Statement)[] = []
    while (!lexer.matchDelimiter('}')) {
      if (lexer.matchDelimiter('{')) {
        content.push(Block.parse(lexer))
      } else {
        Statement.parse(lexer).forEach(statement => content.push(statement))
      }
    }
    lexer.eatDelimiter('}')
    return new Block(content)
  }
}
