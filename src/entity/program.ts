import { PrimitiveType } from '../interpreter/builtins'
import { Frame } from '../interpreter/frame'
import { Lexer } from '../parser/lexer'
import { FunctionCall } from './expression/functionCall'
import { Statement } from './statement/statement'

export class Program {
  private statements: Statement[]

  constructor(statements: Statement[]) {
    this.statements = statements
  }

  static parse(lexer: Lexer, env: Frame | null): Program {
    const statements: Statement[] = []
    const frame = env == null ? Frame.extend(Frame.getBuiltinFrame()) : env
    FunctionCall.clearCalledFunctions()
    while (lexer.hasNext()) {
      Statement.parse(frame, lexer, false, false, null, true).forEach(statement =>
        statements.push(statement)
      )
    }
    FunctionCall.checkCalledFunctionDefinition(frame)
    return new Program(statements)
  }

  execute(context: any, env: Frame | null): Frame {
    const frame = env == null ? Frame.extend(Frame.getBuiltinFrame()) : env
    try {
      this.statements.forEach(statement => statement.execute(frame, [], context))
      return frame
    } catch (err: any) {
      throw new Error('execution failed, ' + (err instanceof Error ? err.message : String(err)))
    }
  }
}
