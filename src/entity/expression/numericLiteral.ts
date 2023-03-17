import { DataType, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { Memory } from '../../memory/memory'

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

  castToType(newType: DataType): NumericLiteral {
    if (newType == PrimitiveType.FUNCTION || newType == PrimitiveType.VOID) {
      throw new Error("attempt to cast '" + this.type + "' to '" + newType + "'")
    }
    return new NumericLiteral(this.val, newType)
  }

  static booleanToNumericLiteral(val: boolean): NumericLiteral {
    return val ? NumericLiteral.new(1) : NumericLiteral.new(0)
  }

  dereferenceAsNumeric(): NumericLiteral {
    if (!(this.type instanceof PointerType)) {
      throw new Error("attempt to dereference non-pointer type '" + this.type + "' to numeric type")
    } else if (this.type.dereference() == PrimitiveType.CHAR) {
      throw new Error("attempt to dereference type '" + this.type + "' to numeric type")
    }
    if (this.type.dereference() instanceof PointerType) {
      return Memory.getOrAllocate().readInt(this.val).castToType(this.type.dereference())
    } else if (this.type.dereference() == PrimitiveType.INT) {
      return Memory.getOrAllocate().readInt(this.val)
    } else if (this.type.dereference() == PrimitiveType.FLOAT) {
      return Memory.getOrAllocate().readFloat(this.val)
    } else if (this.type.dereference() == PrimitiveType.CHAR) {
      return Memory.getOrAllocate().readChar(this.val)
    } else {
      throw new Error("attempt to read unknown type '" + this.type + "' as numeric type")
    }
  }

  dereferenceAsString(): string {
    if (!(this.type instanceof PointerType)) {
      throw new Error("attempt to dereference non-pointer type '" + this.type + "' to 'char*'")
    }
    if (this.type.dereference() != PrimitiveType.CHAR) {
      throw new Error("attempt to dereference type '" + this.type + "' to 'char*'")
    }
    return Memory.getOrAllocate().readStringLiteral(this.val)
  }

  dereference(): string | NumericLiteral {
    if (!(this.type instanceof PointerType)) {
      throw new Error("attempt to dereference non-pointer type '" + this.type + "'")
    }
    if (this.type.dereference() instanceof PointerType) {
      return Memory.getOrAllocate().readInt(this.val).castToType(this.type.dereference())
    } else if (this.type.dereference() == PrimitiveType.CHAR) {
      return Memory.getOrAllocate().readStringLiteral(this.val)
    } else if (this.type.dereference() == PrimitiveType.INT) {
      return Memory.getOrAllocate().readInt(this.val)
    } else if (this.type.dereference() == PrimitiveType.FLOAT) {
      return Memory.getOrAllocate().readFloat(this.val)
    } else {
      throw new Error("attempt to read unknown type '" + this.type + "'")
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
    ['!', (literal: NumericLiteral) => this.booleanToNumericLiteral(!literal.toBoolean())]
  ])

  truncateDecimals() {
    this.type = PrimitiveType.INT
    this.val = Math[this.val < 0 ? 'ceil' : 'floor'](this.val)
    return this
  }

  divideBy(right: NumericLiteral): NumericLiteral {
    if (this.type == PrimitiveType.INT && right.type == PrimitiveType.INT) {
      return NumericLiteral.new(this.val / right.val).truncateDecimals()
    }
    return new NumericLiteral(this.val / right.val, PrimitiveType.FLOAT)
  }

  plus(right: NumericLiteral) {
    if (this.type == PrimitiveType.INT && right.type == PrimitiveType.INT) {
      return new NumericLiteral(this.val + right.val, PrimitiveType.INT)
    }
    return new NumericLiteral(this.val + right.val, PrimitiveType.FLOAT)
  }

  minus(right: NumericLiteral) {
    if (this.type == PrimitiveType.INT && right.type == PrimitiveType.INT) {
      return new NumericLiteral(this.val - right.val, PrimitiveType.INT)
    }
    return new NumericLiteral(this.val - right.val, PrimitiveType.FLOAT)
  }

  multiply(right: NumericLiteral) {
    if (this.type == PrimitiveType.INT && right.type == PrimitiveType.INT) {
      return new NumericLiteral(this.val * right.val, PrimitiveType.INT)
    }
    return new NumericLiteral(this.val * right.val, PrimitiveType.FLOAT)
  }

  modulo(right: NumericLiteral) {
    if (this.type == PrimitiveType.INT && right.type == PrimitiveType.INT) {
      return new NumericLiteral(this.val % right.val, PrimitiveType.INT)
    }
    return new NumericLiteral(this.val % right.val, PrimitiveType.FLOAT)
  }

  sqrt() {
    return new NumericLiteral(Math.sqrt(this.val), PrimitiveType.FLOAT)
  }

  static new(val: number): NumericLiteral {
    return new NumericLiteral(
      val,
      val % 1 != 0
        ? PrimitiveType.FLOAT
        : val >= 0 && val < 256
        ? PrimitiveType.CHAR
        : PrimitiveType.INT
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
      return NumericLiteral.new(val)
    }
  }

  constructor(val: number, type: DataType) {
    this.val = val
    this.type = type
    if (type == PrimitiveType.INT) {
      this.truncateDecimals()
    }
  }

  getDataType(): DataType {
    return this.type
  }
}
