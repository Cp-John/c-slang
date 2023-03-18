import { PrimitiveType } from '../interpreter/builtins'
import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { FunctionCall } from './expression/functionCall'
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
    FunctionCall.clearCalledFunctions()
    while (lexer.hasNext()) {
      Declaration.parse(frame, lexer, false, false, PrimitiveType.VOID, true).forEach(declaration =>
        declarations.push(declaration)
      )
    }
    FunctionCall.checkCalledFunctionDefinition(frame)
    try {
      frame.lookupFunction('main')
    } catch (err) {
      throw new Error("entry of execution: 'main' function not found")
    }
    return new Program(declarations)
  }

  execute(context: any): void {
    const frame = Frame.extend(Frame.getBuiltinFrame())
    this.declarations.forEach(declaration => declaration.execute(frame, [], {}))
    try {
      frame.lookupFunction('main').call(frame, [], context, [])
    } catch (err: any) {
      throw new Error('execution failed, ' + (err instanceof Error ? err.message : String(err)))
    }
  }
}
