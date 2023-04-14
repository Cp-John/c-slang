import { Frame } from '../../interpreter/frame'
import { CHAR_MAX, CHAR_MIN, INT_MAX, INT_MIN, UINT_MAX, UNARY_MINUS_TAG } from '../constant'
import { ArrayType } from '../datatype/arrayType'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveTypes } from '../datatype/primitiveType'
import { StructType } from '../datatype/structType'

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
    if (this.type instanceof PointerType || this.type instanceof ArrayType) {
      return this.type.dereference().getSize()
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

  private cap(): NumericLiteral {
    if (this.type == PrimitiveTypes.int) {
      this.val = ((this.val - INT_MIN) % (INT_MAX - INT_MIN + 1)) + INT_MIN
      if (this.val < INT_MIN) {
        this.val += INT_MAX - INT_MIN + 1
      }
    } else if (this.type == PrimitiveTypes.char) {
      this.val = ((this.val - CHAR_MIN) % (CHAR_MAX - CHAR_MIN + 1)) + CHAR_MIN
      if (this.val < CHAR_MIN) {
        this.val += CHAR_MAX - CHAR_MIN + 1
      }
    } else if (
      this.type instanceof PointerType ||
      this.type instanceof ArrayType ||
      this.type instanceof StructType
    ) {
      this.val = this.val % (UINT_MAX + 1)
      if (this.val < 0) {
        this.val += UINT_MAX + 1
      }
    }
    return this
  }

  castToType(newType: DataType, isInPlace: boolean = false): NumericLiteral {
    if (newType == PrimitiveTypes.function || newType == PrimitiveTypes.void) {
      throw new Error('impossible execution path')
    }
    if (
      newType.toString() == this.type.toString() ||
      (newType instanceof PointerType && this.type instanceof PointerType)
    ) {
      return new NumericLiteral(this.val, newType, isInPlace ? this.address : null).cap()
    } else if (this.type == PrimitiveTypes.float) {
      this.truncateDecimals()
      return this.castToType(newType, isInPlace).cap()
    } else if (newType == PrimitiveTypes.char) {
      return new NumericLiteral(this.val % 256, newType, isInPlace ? this.address : null).cap()
    } else if (newType instanceof PointerType || newType instanceof ArrayType) {
      return new NumericLiteral(this.val, newType, isInPlace ? this.address : null).cap()
    } else {
      return new NumericLiteral(this.val, newType, isInPlace ? this.address : null).cap()
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
    this.type = PrimitiveTypes.int
    this.val = Math[this.val < 0 ? 'ceil' : 'floor'](this.val)
    return this
  }

  divideBy(right: NumericLiteral): NumericLiteral {
    if (right.val == 0) {
      throw new Error('division by 0 is undefined')
    }
    return NumericLiteral.new(this.val / right.val).castToType(
      this.type.getResultType('/', right.type)
    )
  }

  plus(right: NumericLiteral): NumericLiteral {
    if (right.type instanceof PointerType || right.type instanceof ArrayType) {
      return right.plus(this)
    } else {
      return NumericLiteral.new(this.val + right.val * this.getStep()).castToType(
        this.type.getResultType('+', right.type)
      )
    }
  }

  minus(right: NumericLiteral) {
    if (
      (this.type instanceof PointerType && right.type instanceof PointerType) ||
      (this.type instanceof ArrayType && right.type instanceof ArrayType)
    ) {
      return NumericLiteral.new((this.val - right.val) / this.getStep()).castToType(
        PrimitiveTypes.int
      )
    } else {
      return NumericLiteral.new(this.val - right.val * this.getStep()).castToType(
        this.type.getResultType('-', right.type)
      )
    }
  }

  multiply(right: NumericLiteral) {
    return NumericLiteral.new(this.val * right.val).castToType(
      this.type.getResultType('*', right.type)
    )
  }

  modulo(right: NumericLiteral) {
    if (right.val == 0) {
      throw new Error('remainder by 0 is undefined')
    }
    return NumericLiteral.new(this.val % right.val).castToType(
      this.type.getResultType('%', right.type)
    )
  }

  sqrt() {
    return new NumericLiteral(Math.sqrt(this.val), PrimitiveTypes.float)
  }

  abs() {
    return new NumericLiteral(Math.abs(this.val), PrimitiveTypes.int)
  }

  static new(val: number, address: number | null = null): NumericLiteral {
    return new NumericLiteral(
      val,
      val % 1 != 0
        ? PrimitiveTypes.float
        : val >= -128 && val <= 127
        ? PrimitiveTypes.char
        : PrimitiveTypes.int,
      address
    )
  }

  static parse(str: string): NumericLiteral {
    const val = parseFloat(str)
    if (isNaN(val)) {
      return NumericLiteral.new(0)
    }
    if (str.includes('.')) {
      return new NumericLiteral(val, PrimitiveTypes.float)
    } else {
      return new NumericLiteral(val, PrimitiveTypes.int)
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
