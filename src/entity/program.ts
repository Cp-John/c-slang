import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { FunctionCall } from './expression/functionCall'
import { Declaration } from './statement/declaration'

export class Program {
  private declarations: Declaration[]

  constructor(declarations: Declaration[]) {
    this.declarations = declarations
  }

  static parse(lexer: Lexer): Program {
    const declarations: Declaration[] = []
    const frame = Frame.extend(Frame.getBuiltinFrame())
    FunctionCall.clearCalledFunctions()
    while (lexer.hasNext()) {
      Declaration.parse(frame, lexer, false, false, null, true).forEach(declaration =>
        declarations.push(declaration)
      )
    }
    try {
      frame.lookupFunction('main')
    } catch (err) {
      throw new Error(
        "entry of execution 'main' function not found, " +
          (err instanceof Error ? err.message : String(err))
      )
    }
    FunctionCall.checkCalledFunctionDefinition(frame)
    return new Program(declarations)
  }

  execute(context: any): void {
    const frame = Frame.extend(Frame.getBuiltinFrame())
    try {
      this.declarations.forEach(declaration => declaration.execute(frame, [], context))
      frame.lookupFunction('main').call(frame, [], context, [])
    } catch (err: any) {
      throw new Error('execution failed, ' + (err instanceof Error ? err.message : String(err)))
    }
  }
}
