import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { Function } from './function'
import { Declaration } from './statement/declaration'
import { Statement } from './statement/statement'

export class Program {
  private declarations: Statement[]

  constructor(declarations: Statement[]) {
    this.declarations = declarations
  }

  static parse(lexer: Lexer): Program {
    const declarations: Statement[] = []
    while (lexer.hasNext()) {
      Declaration.parse(lexer).forEach(statement => declarations.push(statement))
    }
    return new Program(declarations)
  }

  execute(): void {
    const frame = Frame.createNewFrame()
    this.declarations.forEach(statement => statement.execute(frame, []))
    ;(frame.lookup('main') as Function).call(frame, [], [])
  }
}
