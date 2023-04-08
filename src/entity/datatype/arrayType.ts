import { DataType } from './dataType'
import { PrimitiveType, PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscriptableType'

export type NonPointerLikeType = PrimitiveType | StructType

export type ElementType = PointerType | PrimitiveType | StructType

const MAX_ARRAY_SIZE = Math.pow(2, 20)

export class ArrayType extends SubscriptableType {
  private eleType: ElementType
  private dimension: number
  private sizes: number[]
  private _isComplete: boolean

  private constructor(
    eleType: ElementType,
    dimension: number,
    sizes: number[],
    isComplete: boolean
  ) {
    super(sizes.reduce((a, b) => a * b, 1) * eleType.getSize())
    this.eleType = eleType
    this.dimension = dimension
    this.sizes = sizes
    this._isComplete = isComplete
  }

  override isComplete(): boolean {
    return this._isComplete
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
    this.assertIsComplete()
    return this.sizes.reduce((a, b) => a * b, 1)
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (operator == '+' || (operator == '-' && rightType.isWholePrimitiveType())) {
      return this.toPointerType()
    }
    return undefined
  }

  override dereference(): DataType {
    if (this.dimension == 1) {
      return this.eleType
    } else {
      return new ArrayType(
        this.eleType,
        this.dimension - 1,
        this._isComplete ? this.sizes.slice(1) : this.sizes,
        true
      )
    }
  }

  toString(): string {
    this.assertIsComplete()
    let result = this.eleType.toString()
    for (let i = 0; i < this.dimension; i++) {
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

  private parseInitialStringExpressions(lexer: Lexer, expressions: Expression[]): number {
    const stringLiteral = lexer.eatStringLiteral()
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      expressions.push(
        Expression.of(NumericLiteral.new(stringLiteral.charCodeAt(i)).castToType(this.eleType))
      )
    }
    expressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
    return stringLiteral.length - 1
  }

  private padInitialArrayExpressions(
    eleCount: number,
    currentExpressions: Expression[],
    expressions: Expression[],
    row: number,
    col: number,
    lexer: Lexer
  ) {
    if (!this._isComplete) {
      this._isComplete = true
      console.log(this.size)
      this.sizes.unshift(Math.ceil((eleCount * this.eleType.getSize()) / this.size))
      this.size *= this.sizes[0]
    } else if (eleCount > this.getEleCount()) {
      throw new Error(
        lexer.formatError('more elements in array initializer than expected', row, col)
      )
    }
    for (let i = eleCount; i < this.getEleCount(); i++) {
      if (this.eleType instanceof StructType) {
        this.eleType.defaultInitialExpressions().forEach(expr => currentExpressions.push(expr))
      } else {
        currentExpressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
      }
    }
    currentExpressions.forEach(expr => expressions.push(expr))
  }

  defaultInitialExpressions(): Expression[] {
    const result: Expression[] = []
    this.assertIsComplete()
    for (let i = 0; i < this.getEleCount(); i++) {
      if (this.eleType instanceof StructType) {
        this.eleType.defaultInitialExpressions().forEach(expr => result.push(expr))
      } else {
        result.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
      }
    }
    return result
  }

  private parseElement(env: Frame, lexer: Lexer, expressions: Expression[]): void {
    if (this.eleType instanceof StructType) {
      this.eleType.parseInitialExpressions(env, lexer).forEach(expr => expressions.push(expr))
    } else {
      expressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType, false))
    }
  }

  parseInitialArrayExpressions(env: Frame, lexer: Lexer, expressions: Expression[]): void {
    const [row, col] = lexer.tell()
    const currentExpressions: Expression[] = []
    if (lexer.matchDelimiter('"') && this.eleType == PrimitiveTypes.char && this.dimension == 1) {
      const len = this.parseInitialStringExpressions(lexer, currentExpressions)
      this.padInitialArrayExpressions(len, currentExpressions, expressions, row, col, lexer)
      return
    }

    let eleCount = 0

    lexer.eatDelimiter('{')
    while (!lexer.matchDelimiter('}')) {
      if (this.dimension == 1 || (!lexer.matchDelimiter('{') && !lexer.matchDelimiter('"'))) {
        this.parseElement(env, lexer, currentExpressions)
        eleCount++
      } else {
        const subArrayType = this.dereference() as ArrayType
        subArrayType.parseInitialArrayExpressions(env, lexer, currentExpressions)
        eleCount += subArrayType.getEleCount()
      }
      if (lexer.matchDelimiter(',')) {
        lexer.eatDelimiter(',')
      } else {
        break
      }
    }
    lexer.eatDelimiter('}')
    this.padInitialArrayExpressions(eleCount, currentExpressions, expressions, row, col, lexer)
  }

  static wrap(env: Frame, lexer: Lexer, eleType: ElementType, allowInComplete: boolean): ArrayType {
    const sizes: number[] = []
    let eleCount: number = 1
    let isComplete = null
    let dimension = 0
    do {
      lexer.eatDelimiter('[')
      dimension++
      if (lexer.matchDelimiter(']')) {
        if (isComplete != null || !allowInComplete) {
          throw new Error(lexer.formatError('array type needs an explicit size'))
        }
        lexer.eatDelimiter(']')
        isComplete = false
        continue
      } else if (isComplete == null) {
        isComplete = true
      }
      const [row, col] = lexer.tell()
      const constExpr = ExpressionParser.parse(env, lexer, false, true, PrimitiveTypes.int, false)
      let size
      try {
        size = constExpr.evaluate(env, new CProgramContext()) as NumericLiteral
      } catch (err) {
        throw new Error(
          'Line ' + String(row) + ': ' + (err instanceof Error ? err.message : String(err))
        )
      }
      if (size.getValue() <= 0) {
        throw new Error(lexer.formatError('array type needs a positive size', row, col))
      }
      eleCount *= size.getValue()
      if (eleCount * eleType.getSize() > MAX_ARRAY_SIZE) {
        throw new Error(lexer.formatError('array is too large', row, col))
      }
      sizes.push(size.getValue())
      lexer.eatDelimiter(']')
    } while (lexer.matchDelimiter('['))
    return new ArrayType(eleType, dimension, sizes, isComplete)
  }
}

import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { PointerType } from './pointerType'
import { StructType } from './structType'
