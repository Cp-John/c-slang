import { Lexer } from '../../parser/lexer'
import { FunctionCall } from './functionCall'

export class Expression {
  private elements: (string | number | FunctionCall)[]

  constructor(elements: (string | number | FunctionCall)[]) {
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
    result: (string | number | FunctionCall)[]
  ): void {
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(lexer, result)
      result.push('!')
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      this.recurParseLogicalExpression(lexer, result)
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
    result: (string | number | FunctionCall)[]
  ): void {
    this.recurParseNumericTerm(lexer, result)
    while (lexer.matchPrioritizedOperator()) {
      const opr = lexer.eatOperator()
      this.recurParseNumericTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParseNumericalExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall)[]
  ): void {
    this.recurParsePrioritizedNumericTerm(lexer, result)
    while (lexer.matchOperator()) {
      const opr = lexer.eatOperator()
      this.recurParsePrioritizedNumericTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedRelationalTerm(
    lexer: Lexer,
    result: (string | number | FunctionCall)[]
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
    result: (string | number | FunctionCall)[]
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
    result: (string | number | FunctionCall)[]
  ): void {
    this.recurParseRelationalExpression(lexer, result)
    while (lexer.matchDelimiter('&&')) {
      lexer.eatDelimiter('&&')
      this.recurParseRelationalExpression(lexer, result)
      result.push('&&')
    }
  }

  private static recurParseLogicalExpression(
    lexer: Lexer,
    result: (string | number | FunctionCall)[]
  ): void {
    this.recurParsePrioritizedLogicalTerm(lexer, result)
    while (lexer.matchDelimiter('||')) {
      lexer.eatDelimiter('||')
      this.recurParsePrioritizedLogicalTerm(lexer, result)
      result.push('||')
    }
  }

  static parse(lexer: Lexer): Expression {
    const result: (string | number | FunctionCall)[] = []
    this.recurParseLogicalExpression(lexer, result)
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
