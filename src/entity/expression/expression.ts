import { Lexer } from '../../parser/lexer'
import { Statement } from '../statement/statement'
import { FunctionCall } from './functionCall'

export class Expression extends Statement {
  private elements: (string | number | FunctionCall)[]

  constructor(elements: (string | number | FunctionCall)[]) {
    super()
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
    if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      Expression.recurParseNumericalExpression(lexer, result)
      lexer.eatDelimiter(')')
    } else if (lexer.matchNumber()) {
      result.push(lexer.eatNumber())
    } else {
      result.push(lexer.eatIdentifier())
      if (lexer.matchDelimiter('(')) {
        result.push(new FunctionCall(String(result.pop()), this.parseActualParameterList(lexer)))
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

  static parse(lexer: Lexer): Expression {
    const result: (string | number | FunctionCall)[] = []
    this.recurParseNumericalExpression(lexer, result)
    return new Expression(result)
  }

  isIdentifier(): boolean {
    return this.elements.length == 1 && typeof(this.elements[0]) == 'string';
  }

  toIdentifier(): string {
    if (this.elements.length != 1 || typeof(this.elements[0]) != 'string') {
      throw new Error(String(this.elements) + ' is not an identifier')
    }
    
    return this.elements[0];
  }
}
