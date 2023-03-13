import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { Function } from './function/function'
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
      Declaration.parse(lexer, true).forEach(declaration => declarations.push(declaration))
    }
    return new Program(declarations)
  }

  execute(): void {
    const frame = Frame.createNewFrame()
    this.declarations.forEach(declaration => declaration.execute(frame, [], {}))
    const context = { stdout: '' }
    ;(frame.lookup('main') as Function).call(frame, [], context, [])
  }
}
