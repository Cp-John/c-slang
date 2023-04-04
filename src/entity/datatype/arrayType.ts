import { DataType } from './dataType'
import { PrimitiveType, PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscritableType'

export type ElementType = PointerType | PrimitiveType

export class ArrayType extends SubscriptableType {
  private eleType: ElementType
  private sizes: number[]

  constructor(eleType: ElementType, sizes: number[]) {
    super(sizes.reduce((a, b) => a * b, 1) * eleType.getSize())
    this.eleType = eleType
    this.sizes = sizes
  }

  toPointerType(): PointerType {
    return new PointerType(this.dereference())
  }

  getEleType(): ElementType {
    return this.eleType
  }

  getEleCount(): number {
    return this.sizes.reduce((a, b) => a * b, 1)
  }

  override applyBinaryOperator(operator: string, leftType: DataType): DataType | undefined {
    return undefined
  }

  override dereference(): DataType {
    if (this.sizes.length == 1) {
      return this.eleType
    } else {
      return new ArrayType(this.eleType, this.sizes.slice(1))
    }
  }

  toString(): string {
    let result = this.eleType.toString()
    for (let i = 0; i < this.sizes.length; i++) {
      result += '[' + String(this.sizes[i]) + ']'
    }
    return result
  }

  canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() || this.toPointerType().canImplicitCastTo(targetType)
    )
  }

  canExplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() || this.toPointerType().canExplicitCastTo(targetType)
    )
  }

  private parseInitialStringExpressions(lexer: Lexer, expressions: Expression[]): void {
    const stringLiteral = lexer.eatStringLiteral()
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      expressions
        .push
        // Expression.of(NumericLiteral.new(stringLiteral.charCodeAt(i)).castToType(this.eleType))
        ()
    }
    // expressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
  }

  private padInitialArrayExpressions(
    currentExpressions: Expression[],
    expressions: Expression[],
    row: number,
    col: number,
    lexer: Lexer
  ) {
    if (currentExpressions.length > this.getEleCount()) {
      throw new Error(
        lexer.formatError('more elements in array initializer than expected', row, col)
      )
    }
    for (let i = currentExpressions.length; i < this.getEleCount(); i++) {
      // currentExpressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
    }
    currentExpressions.forEach(expr => expressions.push(expr))
  }

  parseInitialArrayExpressions(env: Frame, lexer: Lexer, expressions: Expression[]): void {
    const [row, col] = lexer.tell()
    const currentExpressions: Expression[] = []
    if (
      lexer.matchDelimiter('"') &&
      this.eleType == PrimitiveTypes.char &&
      this.sizes.length == 1
    ) {
      this.parseInitialStringExpressions(lexer, currentExpressions)
      this.padInitialArrayExpressions(currentExpressions, expressions, row, col, lexer)
      return
    }

    lexer.eatDelimiter('{')
    if (lexer.matchDelimiter('}')) {
      // pass
    } else if (
      this.sizes.length == 1 ||
      !(lexer.matchDelimiter('"') || lexer.matchDelimiter('{'))
    ) {
      // currentExpressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType))
      while (!lexer.matchDelimiter('}')) {
        lexer.eatDelimiter(',')
        // currentExpressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType))
      }
    } else {
      ;(this.dereference() as ArrayType).parseInitialArrayExpressions(
        env,
        lexer,
        currentExpressions
      )
    }
    lexer.eatDelimiter('}')
    this.padInitialArrayExpressions(currentExpressions, expressions, row, col, lexer)
  }
}

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { PointerType } from './pointerType'
