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
    // console.log('='.repeat(20) + 'start executing' + '='.repeat(20))
    const context: CProgramContext = {
      stdout: '',
      baseFrame: Frame.extend(Frame.getBuiltinFrame()),
      currentLine: 0
    }
    try {
      this.declarations.forEach(declaration => declaration.execute(context.baseFrame, context))
      context.baseFrame.lookupFunction('main').call(context.baseFrame, context, [])
      return context.stdout
    } catch (err: any) {
      // console.log('stdout:', context.stdout)
      throw new Error(
        'Line ' +
          String(context.currentLine) +
          ': execution failed, ' +
          (err instanceof Error ? err.message : String(err))
      )
    } finally {
      // console.log('='.repeat(20) + 'executing finished' + '='.repeat(20))
    }
  }
}
