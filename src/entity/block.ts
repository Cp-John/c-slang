import { DataType } from '../interpreter/builtins'
import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { Return } from './statement/return'
import { Statement } from './statement/statement'

export class Block {
  private content: (Statement | Block)[]

  constructor(content: (Statement | Block)[]) {
    this.content = content
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): Block {
    lexer.eatDelimiter('{')
    const content: (Block | Statement)[] = []
    const newEnv = Frame.extend(env)
    let reachable = true
    while (!lexer.matchDelimiter('}')) {
      if (!reachable) {
        throw new Error(lexer.formatError('unreachable statements'))
      }
      if (lexer.matchDelimiter('{')) {
        content.push(Block.parse(newEnv, lexer, allowBreak, allowContinue, returnType))
      } else {
        Statement.parse(newEnv, lexer, allowBreak, allowContinue, returnType).forEach(statement =>
          content.push(statement)
        )
        reachable = !(content[content.length - 1] instanceof Return)
      }
    }
    lexer.eatDelimiter('}')
    return new Block(content)
  }

  execute(env: Frame, rts: any[], context: any): void {
    const newEnv = Frame.extend(env)
    this.content.forEach(executable => executable.execute(newEnv, rts, context))
  }
}
