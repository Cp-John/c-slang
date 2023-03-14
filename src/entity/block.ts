import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Block {
  private content: (Statement | Block)[]

  constructor(content: (Statement | Block)[]) {
    this.content = content
  }

  static parse(env: Frame, lexer: Lexer, isInLoop: boolean): Block {
    lexer.eatDelimiter('{')
    const content: (Block | Statement)[] = []
    const newEnv = Frame.extend(env)
    while (!lexer.matchDelimiter('}')) {
      if (lexer.matchDelimiter('{')) {
        content.push(Block.parse(newEnv, lexer, isInLoop))
      } else {
        Statement.parse(newEnv, lexer, isInLoop).forEach(statement => content.push(statement))
      }
    }
    lexer.eatDelimiter('}')
    return new Block(content)
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    const newEnv = Frame.extend(env)
    this.content.forEach(executable => executable.execute(newEnv, rts, context))
  }
}
