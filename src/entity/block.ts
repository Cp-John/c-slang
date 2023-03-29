import { DataType } from '../interpreter/builtins'
import { CProgramContext } from '../interpreter/cProgramContext'
import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { Return } from './statement/return'
import { Break, Continue } from './statement/simpleStatement'
import { Statement } from './statement/statement'

export class Block {
  private content: (Statement | Block)[]
  private isFunctionBody: boolean

  constructor(content: (Statement | Block)[], isFunctionBody: boolean = false) {
    this.content = content
    this.isFunctionBody = isFunctionBody
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null,
    isFunctionBody: boolean = false
  ): Block {
    const content: (Block | Statement)[] = []
    const newEnv = isFunctionBody ? env : Frame.extend(env)
    let reachable = true
    if (!lexer.matchDelimiter('{')) {
      Statement.parse(newEnv, lexer, allowBreak, allowContinue, returnType).forEach(statement =>
        content.push(statement)
      )
      return new Block(content)
    }
    lexer.eatDelimiter('{')
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
        const lastStatement = content[content.length - 1]
        reachable = !(
          lastStatement instanceof Return ||
          lastStatement instanceof Break ||
          lastStatement instanceof Continue
        )
      }
    }
    lexer.eatDelimiter('}')
    return new Block(content, isFunctionBody)
  }

  execute(env: Frame, context: CProgramContext): void {
    const newEnv = this.isFunctionBody ? env : Frame.extend(env)
    this.content.forEach(executable => executable.execute(newEnv, context))
  }
}
