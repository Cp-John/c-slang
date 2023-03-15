import { DataType, Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
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
      Declaration.parse(frame, lexer, false, false, DataType.VOID, true).forEach(declaration =>
        declarations.push(declaration)
      )
    }
    return new Program(declarations)
  }

  private static getErrorMessage(err: any): string {
    if (err instanceof Error) {
      return err.message
    } else {
      return String(err)
    }
  }

  execute(context: any): void {
    const frame = Frame.extend(Frame.getBuiltinFrame())
    this.declarations.forEach(declaration => declaration.execute(frame, [], {}))
    let mainFunction
    try {
      mainFunction = frame.lookupFunction('main')
    } catch (err) {
      throw new Error("entry of execution: 'main' function not found, " + Program.getErrorMessage(err))
    }
    try {
      mainFunction.call(frame, [], context, [])
    } catch (err: any) {
      throw new Error('execution failed, ' + Program.getErrorMessage(err))
    }
  }
}
