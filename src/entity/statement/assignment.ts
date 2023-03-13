import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
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
    const expression = ExpressionParser.parse(lexer)
    lexer.eatDelimiter(';')
    return [new Assignment(variable, opr, expression)]
  }

  execute(env: Frame, rts: Frame[], context: any): void {
    Expression.ASSIGNMENT_OPERATORS[this.assignmentOpr](
      this.expression.evaluate(env, rts, context),
      this.variable,
      env
    )
  }
}
