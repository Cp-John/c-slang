import { Lexer } from '../parser/lexer'
import { Statement } from './statement/statement'

export class Program {
  private statements: Statement[]

  constructor(statements: Statement[]) {
    this.statements = statements
  }

  static parse(lexer: Lexer): Program {
    const statements: Statement[] = []
    while (lexer.hasNext()) {
      Statement.parse(lexer).forEach(statement => statements.push(statement))
    }
    return new Program(statements)
  }
}
