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
    if (!frame.isFunctionDefined('main')) {
      throw new Error("entry of execution 'main' function has no definition yet")
    }
    FunctionCall.checkCalledFunctionDefinition(frame, lexer)
    return new Program(declarations)
  }

  execute(frontendContext: any, maxExecTimMs: number): string {
    // console.log('='.repeat(20) + 'start executing' + '='.repeat(20))
    const context: CProgramContext = new CProgramContext(maxExecTimMs)
    try {
      this.declarations.forEach(declaration => declaration.execute(context.getBaseFrame(), context))
      context.getBaseFrame().lookupFunction('main').call(context.getBaseFrame(), context, [])
    } catch (err: any) {
      // console.log('stdout:', context.stdout)
      frontendContext['stdout'] = context.getStdout()
      if (err instanceof Error) {
        throw new Error(
          'Line ' + String(context.getCurrentLineNum()) + ': execution failed, ' + err.message
        )
      } else {
        context.print('\nLine ' + String(context.getCurrentLineNum()) + ': ' + String(err))
      }
    } finally {
      // console.log('='.repeat(20) + 'executing finished' + '='.repeat(20))
    }
    return context.getStdout()
  }
}
