import { DataType } from './dataType'
import { PrimitiveType, PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscriptableType'

export type NonPointerLikeType = PrimitiveType | StructType

export type ElementType = PointerType | PrimitiveType | StructType

const MAX_ARRAY_SIZE = Math.pow(2, 20)

export class ArrayType extends SubscriptableType {
  private eleType: ElementType
  private sizes: number[]

  constructor(eleType: ElementType, sizes: number[]) {
    super(sizes.reduce((a, b) => a * b, 1) * eleType.getSize())
    this.eleType = eleType
    this.sizes = sizes
  }

  override isArrayType(): boolean {
    return true
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

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (operator == '+' || (operator == '-' && rightType.isWholePrimitiveType())) {
      return this.toPointerType()
    }
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

  override canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() || this.toPointerType().canImplicitCastTo(targetType)
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() || this.toPointerType().canExplicitCastTo(targetType)
    )
  }

  private parseInitialStringExpressions(lexer: Lexer, expressions: Expression[]): void {
    const stringLiteral = lexer.eatStringLiteral()
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      expressions.push(
        Expression.of(NumericLiteral.new(stringLiteral.charCodeAt(i)).castToType(this.eleType))
      )
    }
    expressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
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
      currentExpressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
    }
    currentExpressions.forEach(expr => expressions.push(expr))
  }

  parseInitialExpressions(env: Frame, lexer: Lexer) {
    const result: Expression[] = []
    this.parseInitialArrayExpressions(env, lexer, result)
    return result
  }

  defaultInitialExpressions(): Expression[] {
    const result: Expression[] = []
    for (let i = 0; i < this.getEleCount(); i++) {
      if (this.eleType instanceof StructType) {
        this.eleType.defaultInitialExpressions().forEach(expr => result.push(expr))
      } else {
        result.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
      }
    }
    return result
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
      currentExpressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType, false))
      while (!lexer.matchDelimiter('}')) {
        lexer.eatDelimiter(',')
        currentExpressions.push(
          ExpressionParser.parse(env, lexer, false, false, this.eleType, false)
        )
      }
    } else {
      while (true) {
        ;(this.dereference() as ArrayType).parseInitialArrayExpressions(
          env,
          lexer,
          currentExpressions
        )
        if (lexer.matchDelimiter(',')) {
          lexer.eatDelimiter(',')
        } else {
          break
        }
      }
    }
    lexer.eatDelimiter('}')
    this.padInitialArrayExpressions(currentExpressions, expressions, row, col, lexer)
  }

  static wrap(env: Frame, lexer: Lexer, eleType: ElementType): ArrayType {
    const sizes: number[] = []
    let eleCount: number = 1
    do {
      lexer.eatDelimiter('[')
      if (lexer.matchDelimiter(']')) {
        throw new Error(
          lexer.formatError('definition of variable with array type needs an explicit size')
        )
      }
      const [row, col] = lexer.tell()
      const constExpr = ExpressionParser.parse(env, lexer, false, true, PrimitiveTypes.int, false)
      let size
      try {
        size = constExpr.evaluate(env, initCProgramContext()) as NumericLiteral
      } catch (err) {
        throw new Error(
          'Line ' + String(row) + ': ' + (err instanceof Error ? err.message : String(err))
        )
      }
      if (size.getValue() <= 0) {
        throw new Error(
          lexer.formatError('declared as an array with a non-positive size', row, col)
        )
      }
      eleCount *= size.getValue()
      if (eleCount * eleType.getSize() > MAX_ARRAY_SIZE) {
        throw new Error(lexer.formatError('array is too large', row, col))
      }
      sizes.push(size.getValue())
      lexer.eatDelimiter(']')
    } while (lexer.matchDelimiter('['))
    return new ArrayType(eleType, sizes)
  }
}

import { initCProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { PointerType } from './pointerType'
import { StructType } from './structType'
