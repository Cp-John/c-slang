import { DataType, PointerType, PrimitiveType, sizeof } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { UNARY_MINUS_TAG } from './expressionParser'
import { getHigherPrecisionType } from './typeCheck'

interface BinaryArithmeticOperator {
  (right: NumericLiteral, left: NumericLiteral): NumericLiteral
}

interface UnaryArithmeticOperator {
  (literal: NumericLiteral): NumericLiteral
}

export class NumericLiteral {
  private val: number
  private type: DataType
  private address: number | null

  getValue(): number {
    return this.val
  }

  private getStep(): number {
    if (this.type instanceof PointerType) {
      return sizeof(this.type.dereference())
    }
    return 1
  }

  toChar(): string {
    return String.fromCharCode(this.val)
  }

  increment(env: Frame, isPrefix: boolean): NumericLiteral {
    this.assertIsLValue()
    this.val += this.getStep()
    env.assignValueByAddress(this.address as number, this)
    return new NumericLiteral(isPrefix ? this.val : this.val - this.getStep(), this.type)
  }

  decrement(env: Frame, isPrefix: boolean): NumericLiteral {
    this.assertIsLValue()
    this.val -= this.getStep()
    env.assignValueByAddress(this.address as number, this)
    return new NumericLiteral(isPrefix ? this.val : this.val + this.getStep(), this.type)
  }

  toBoolean(): boolean {
    return this.val != 0
  }

  castToType(newType: DataType, isInPlace: boolean = false): NumericLiteral {
    if (newType == PrimitiveType.FUNCTION || newType == PrimitiveType.VOID) {
      throw new Error("attempt to cast '" + this.type + "' to '" + newType + "'")
    }
    if (
      newType.toString() == this.type.toString() ||
      (newType instanceof PointerType && this.type instanceof PointerType)
    ) {
      return new NumericLiteral(this.val, newType, isInPlace ? this.address : null)
    } else if (this.type == PrimitiveType.FLOAT) {
      this.truncateDecimals()
      return this.castToType(newType, isInPlace)
    } else if (newType == PrimitiveType.CHAR) {
      return new NumericLiteral(this.val % 256, newType, isInPlace ? this.address : null)
    } else {
      return new NumericLiteral(this.val, newType, isInPlace ? this.address : null)
    }
  }

  static booleanToNumericLiteral(val: boolean): NumericLiteral {
    return val ? NumericLiteral.new(1) : NumericLiteral.new(0)
  }

  assign(env: Frame, right: NumericLiteral, assignOpr: string): NumericLiteral {
    this.assertIsLValue()
    if (assignOpr == '=') {
      env.assignValueByAddress(this.address as number, right.castToType(this.type))
      return right
    } else {
      const operator = NumericLiteral.BINARY_ARITHMETIC_OPERATORS.get(assignOpr.replace('=', ''))
      if (operator == undefined) {
        throw new Error('unknown assign operator: ' + assignOpr)
      }
      const result = operator(right, this)
      env.assignValueByAddress(this.address as number, result.castToType(this.type))
      return result
    }
  }

  static readonly BINARY_ARITHMETIC_OPERATORS: Map<string, BinaryArithmeticOperator> = new Map([
    ['+', (right: NumericLiteral, left: NumericLiteral) => left.plus(right)],
    ['-', (right: NumericLiteral, left: NumericLiteral) => left.minus(right)],
    ['*', (right: NumericLiteral, left: NumericLiteral) => left.multiply(right)],
    ['/', (right: NumericLiteral, left: NumericLiteral) => left.divideBy(right)],
    ['%', (right: NumericLiteral, left: NumericLiteral) => left.modulo(right)],
    [
      '<',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val < right.val)
    ],
    [
      '<=',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val <= right.val)
    ],
    [
      '>',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val > right.val)
    ],
    [
      '>=',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val >= right.val)
    ],
    [
      '==',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val == right.val)
    ],
    [
      '!=',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.val != right.val)
    ],
    [
      '&&',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.toBoolean() && right.toBoolean())
    ],
    [
      '||',
      (right: NumericLiteral, left: NumericLiteral) =>
        NumericLiteral.booleanToNumericLiteral(left.toBoolean() || right.toBoolean())
    ]
  ])

  static readonly UNARY_ARITHMETIC_OPERATORS: Map<string, UnaryArithmeticOperator> = new Map([
    ['!', (literal: NumericLiteral) => this.booleanToNumericLiteral(!literal.toBoolean())],
    [
      UNARY_MINUS_TAG,
      (literal: NumericLiteral) => NumericLiteral.new(-literal.val).castToType(literal.type)
    ]
  ])

  private truncateDecimals() {
    this.type = PrimitiveType.INT
    this.val = Math[this.val < 0 ? 'ceil' : 'floor'](this.val)
    return this
  }

  divideBy(right: NumericLiteral): NumericLiteral {
    if (right.val == 0) {
      throw new Error('division by 0 is undefined')
    }
    return NumericLiteral.new(this.val / right.val).castToType(
      getHigherPrecisionType(this.type, right.type)
    )
  }

  plus(right: NumericLiteral): NumericLiteral {
    if (this.type instanceof PointerType && right.type instanceof PointerType) {
      throw new Error('impossible execution path')
    } else if (right.type instanceof PointerType) {
      return right.plus(this)
    } else {
      return NumericLiteral.new(this.val + right.val * this.getStep()).castToType(
        getHigherPrecisionType(this.type, right.type)
      )
    }
  }

  minus(right: NumericLiteral) {
    if (this.type instanceof PointerType && right.type instanceof PointerType) {
      return NumericLiteral.new((this.val - right.val) / this.getStep()).castToType(
        PrimitiveType.INT
      )
    } else {
      return NumericLiteral.new(this.val - right.val * this.getStep()).castToType(
        getHigherPrecisionType(this.type, right.type)
      )
    }
  }

  multiply(right: NumericLiteral) {
    return NumericLiteral.new(this.val * right.val).castToType(
      getHigherPrecisionType(this.type, right.type)
    )
  }

  modulo(right: NumericLiteral) {
    if (right.val == 0) {
      throw new Error('remainder by 0 is undefined')
    }
    return NumericLiteral.new(this.val % right.val).castToType(
      getHigherPrecisionType(this.type, right.type)
    )
  }

  sqrt() {
    return new NumericLiteral(Math.sqrt(this.val), PrimitiveType.FLOAT)
  }

  abs() {
    return new NumericLiteral(Math.abs(this.val), PrimitiveType.INT)
  }

  static new(val: number, address: number | null = null): NumericLiteral {
    return new NumericLiteral(
      val,
      val % 1 != 0
        ? PrimitiveType.FLOAT
        : val >= -128 && val <= 127
        ? PrimitiveType.CHAR
        : PrimitiveType.INT,
      address
    )
  }

  static parse(str: string): NumericLiteral {
    const val = parseFloat(str)
    if (isNaN(val)) {
      return NumericLiteral.new(0)
    }
    if (str.includes('.')) {
      return new NumericLiteral(val, PrimitiveType.FLOAT)
    } else {
      return new NumericLiteral(val, PrimitiveType.INT)
    }
  }

  private constructor(val: number, type: DataType, address: number | null = null) {
    this.val = val
    this.type = type
    this.address = address
  }

  isLValue(): boolean {
    return this.address != null
  }

  assertIsLValue(): void {
    if (!this.isLValue()) {
      throw new Error('attempt to access the address of rvalue')
    }
  }

  getAddress(): number {
    this.assertIsLValue()
    return this.address as number
  }

  toAddress(): NumericLiteral {
    return new NumericLiteral(this.getAddress(), new PointerType(this.type))
  }

  getDataType(): DataType {
    return this.type
  }
}
