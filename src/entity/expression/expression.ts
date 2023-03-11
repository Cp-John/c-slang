import { Lexer } from '../../parser/lexer'
import { FunctionCall } from './functionCall'

class Jump {
  condition: boolean | undefined
  toPosition: number

  constructor(condition: boolean | undefined = undefined, toPosition: number = 0) {
    this.condition = condition
    this.toPosition = toPosition
  }
}

export class Expression {
  private elements: (string | number | FunctionCall | Jump)[]

  constructor(elements: (string | number | FunctionCall | Jump)[]) {
    this.elements = elements
  }

  private static parseActualParameterList(lexer: Lexer): Expression[] {
    const result = []
    lexer.eatDelimiter('(')
    if (!lexer.matchDelimiter(')')) {
      result.push(Expression.parse(lexer))
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push(Expression.parse(lexer))
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static recurParseNumericTerm(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(lexer, result)
      result.push('!')
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      this.recurParseExpression(lexer, result)
      lexer.eatDelimiter(')')
    } else if (lexer.matchNumber()) {
      result.push(lexer.eatNumber())
    } else if (lexer.matchDelimiter('"')) {
      result.push(lexer.eatStringLiteral())
    } else if (lexer.matchIncrementDecrementOperator()) {
      result.push(lexer.eatIncrementDecrementOperator() + ' ' + lexer.eatIdentifier())
    } else {
      result.push(lexer.eatIdentifier())
      if (lexer.matchDelimiter('(')) {
        result.push(new FunctionCall(String(result.pop()), this.parseActualParameterList(lexer)))
      } else if (lexer.matchIncrementDecrementOperator()) {
        result[result.length - 1] += ' ' + lexer.eatIncrementDecrementOperator()
      }
    }
  }

  private static recurParsePrioritizedNumericTerm(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParseNumericTerm(lexer, result)
    while (lexer.matchPrioritizedArithmeticOperator()) {
      const opr = lexer.eatArithmeticOperator()
      this.recurParseNumericTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParseNumericalExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedNumericTerm(lexer, result)
    while (lexer.matchArithmeticOperator()) {
      const opr = lexer.eatArithmeticOperator()
      this.recurParsePrioritizedNumericTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedRelationalTerm(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ) {
    this.recurParseNumericalExpression(lexer, result)
    while (lexer.matchPrioritizedRelationalOperator()) {
      const opr = lexer.eatRelationalOperator()
      this.recurParseNumericalExpression(lexer, result)
      result.push(opr)
    }
  }

  private static recurParseRelationalExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedRelationalTerm(lexer, result)
    while (lexer.matchRelationalOperator()) {
      const opr = lexer.eatRelationalOperator()
      this.recurParsePrioritizedRelationalTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedLogicalTerm(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParseRelationalExpression(lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('&&')) {
      jumps.push(new Jump(false))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('&&')
      this.recurParseRelationalExpression(lexer, result)
      result.push('&&')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseLogicalExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedLogicalTerm(lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('||')) {
      jumps.push(new Jump(true))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('||')
      this.recurParsePrioritizedLogicalTerm(lexer, result)
      result.push('||')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseTernaryExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParseLogicalExpression(lexer, result)
    if (!lexer.matchDelimiter('?')) {
      return
    }
    lexer.eatDelimiter('?')
    const jumpToElse = new Jump(false)
    result.push(jumpToElse)
    this.recurParseLogicalExpression(lexer, result)
    const jumpToEnd = new Jump()
    result.push(jumpToEnd)
    lexer.eatDelimiter(':')
    jumpToElse.toPosition = result.length
    this.recurParseLogicalExpression(lexer, result)
    jumpToEnd.toPosition = result.length
  }

  private static recurParseExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall | Jump)[]
  ): void {
    this.recurParseTernaryExpression(lexer, result)
    if (lexer.matchAssignmentOperator()) {
      const opr = lexer.eatAssignmentOperator()
      this.recurParseTernaryExpression(lexer, result)
      result.push(opr)
    }
  }

  static parse(lexer: Lexer): Expression {
    const result: (string | number | FunctionCall | Jump)[] = []
    this.recurParseExpression(lexer, result)
    return new Expression(result)
  }

  isIdentifier(): boolean {
    return (
      this.elements.length == 1 &&
      typeof this.elements[0] == 'string' &&
      new Lexer(this.elements[0]).matchIdentifier()
    )
  }

  toIdentifier(): string {
    if (
      this.elements.length != 1 ||
      typeof this.elements[0] != 'string' ||
      !new Lexer(this.elements[0]).matchIdentifier()
    ) {
      throw new Error(String(this.elements) + ' is not an identifier')
    }

    return this.elements[0]
  }
}
