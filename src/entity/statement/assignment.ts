import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { Statement } from './statement'

export class Assignment extends Statement {
  private variable: string
  private expression: Expression
  private assignmentOpr: string

  constructor(variable: string, assignmentOpr: string, expression: Expression) {
    super()
    this.variable = variable
    this.assignmentOpr = assignmentOpr
    this.expression = expression
  }

  static parse(lexer: Lexer): Assignment[] {
    const variable = lexer.eatIdentifier()
    const opr = lexer.eatAssignmentOperator()
    const expression = Expression.parse(lexer)
    lexer.eatDelimiter(';')
    return [new Assignment(variable, opr, expression)]
  }
}
