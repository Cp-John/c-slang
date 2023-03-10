import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Program {
  private statements: Statement[]

  constructor(statements: Statement[]) {
    this.statements = statements
  }

  static parse(lexer: Lexer): Program {
    const statements = []
    while (lexer.hasNext()) {
      statements.push(Statement.parse(lexer))
    }
    return new Program(statements)
  }
}
