import { CProgramContext } from '../interpreter/cProgramContext'
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

  execute(): string {
    const baseFrame = Frame.extend(Frame.getBuiltinFrame())
    const context: CProgramContext = { stdout: '', baseFrame: baseFrame }
    try {
      this.declarations.forEach(declaration => declaration.execute(baseFrame, context))
      context.baseFrame = baseFrame
      baseFrame.lookupFunction('main').call(baseFrame, context, [])
      return context.stdout
    } catch (err: any) {
      throw new Error('execution failed, ' + (err instanceof Error ? err.message : String(err)))
    }
  }
}
