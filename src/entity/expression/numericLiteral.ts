import { DataType } from '../../interpreter/frame'

interface BinaryArithmeticOperator {
  (right: NumericLiteral, left: NumericLiteral): NumericLiteral
}

interface UnaryArithmeticOperator {
  apply(literal: NumericLiteral): NumericLiteral
}

export class NumericLiteral {
  private val: number
  private type: DataType

  getValue(): number {
    return this.val
  }

  increment(): NumericLiteral {
    return new NumericLiteral(this.val + 1, this.type)
  }

  decrement(): NumericLiteral {
    return new NumericLiteral(this.val - 1, this.type)
  }

  toBoolean(): boolean {
    return this.val != 0
  }

  static booleanToNumericLiteral(val: boolean): NumericLiteral {
    return val ? new NumericLiteral(1, DataType.INT) : new NumericLiteral(0, DataType.INT)
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
    ['!', (literal: NumericLiteral) => this.booleanToNumericLiteral(!literal.toBoolean())]
  ])

  truncateDecimals() {
    this.type = DataType.INT
    this.val = Math[this.val < 0 ? 'ceil' : 'floor'](this.val)
    return this
  }

  divideBy(right: NumericLiteral): NumericLiteral {
    if (this.type == DataType.INT && right.type == DataType.INT) {
      return NumericLiteral.new(this.val / right.val).truncateDecimals()
    }
    return new NumericLiteral(this.val / right.val, DataType.FLOAT)
  }

  plus(right: NumericLiteral) {
    if (this.type == DataType.INT && right.type == DataType.INT) {
      return new NumericLiteral(this.val + right.val, DataType.INT)
    }
    return new NumericLiteral(this.val + right.val, DataType.FLOAT)
  }

  minus(right: NumericLiteral) {
    if (this.type == DataType.INT && right.type == DataType.INT) {
      return new NumericLiteral(this.val - right.val, DataType.INT)
    }
    return new NumericLiteral(this.val - right.val, DataType.FLOAT)
  }

  multiply(right: NumericLiteral) {
    if (this.type == DataType.INT && right.type == DataType.INT) {
      return new NumericLiteral(this.val * right.val, DataType.INT)
    }
    return new NumericLiteral(this.val * right.val, DataType.FLOAT)
  }

  modulo(right: NumericLiteral) {
    if (this.type == DataType.INT && right.type == DataType.INT) {
      return new NumericLiteral(this.val % right.val, DataType.INT)
    }
    return new NumericLiteral(this.val % right.val, DataType.FLOAT)
  }

  static new(val: number): NumericLiteral {
    return new NumericLiteral(val, val % 1 == 0 ? DataType.INT : DataType.FLOAT)
  }

  constructor(val: number, type: DataType) {
    this.val = val
    this.type = type
    if (type == DataType.INT) {
      this.truncateDecimals()
    }
  }

  getDataType(): string {
    return this.type
  }
}
