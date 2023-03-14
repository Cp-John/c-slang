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
    const frame = Frame.extend(Frame.getBuiltinFrame())
    while (lexer.hasNext()) {
      Declaration.parse(frame, lexer, true).forEach(declaration => declarations.push(declaration))
    }
    return new Program(declarations)
  }

  execute(context: any): void {
    const frame = Frame.extend(Frame.getBuiltinFrame())
    this.declarations.forEach(declaration => declaration.execute(frame, [], {}))
    ;(frame.lookup('main') as Function).call(frame, [], context, [])
  }
}
