import { RELATIONAL_OPERATORS } from '../constant'
import { DataType } from './dataType'

export abstract class PrimitiveType extends DataType {
  private repr: string

  constructor(repr: string, size: number) {
    super(size)
    this.repr = repr
  }

  override applyUnaryOperator(operator: string): DataType | undefined {
    if (operator == '!') {
      return PrimitiveTypes.int
    } else if (operator == '-' || operator == '+') {
      return this
    }
    return undefined
  }

  toString(): string {
    return this.repr
  }
}

abstract class ArithPrimitiveType extends PrimitiveType {
  override isArithPrimitiveType(): boolean {
    return true
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (!rightType.isArithPrimitiveType()) {
      return rightType.applyBinaryOperator(operator, this)
    } else if (RELATIONAL_OPERATORS.has(operator) || operator == '&&' || operator == '||') {
      return PrimitiveTypes.int
    } else if (this instanceof FloatType || rightType instanceof FloatType) {
      return operator == '%' ? undefined : PrimitiveTypes.float
    } else {
      return PrimitiveTypes.int
    }
  }
}

abstract class WholePrimitiveType extends ArithPrimitiveType {
  override isWholePrimitiveType(): boolean {
    return true
  }
}

class IntType extends WholePrimitiveType {
  constructor() {
    super('int', 4)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() ||
      targetType == PrimitiveTypes.char ||
      targetType == PrimitiveTypes.float
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return this.canImplicitCastTo(targetType) || targetType.isPointerType()
  }
}

class FloatType extends ArithPrimitiveType {
  constructor() {
    super('float', 4)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return this.toString() == targetType.toString()
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return (
      this.canImplicitCastTo(targetType) ||
      targetType == PrimitiveTypes.int ||
      targetType == PrimitiveTypes.char
    )
  }
}

class CharType extends WholePrimitiveType {
  constructor() {
    super('char', 1)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() ||
      targetType == PrimitiveTypes.int ||
      targetType == PrimitiveTypes.float
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return this.canImplicitCastTo(targetType) || targetType.isPointerType()
  }
}

class VoidType extends PrimitiveType {
  constructor() {
    super('void', 1)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    return undefined
  }

  override applyUnaryOperator(operator: string): DataType | undefined {
    return undefined
  }
}

class FunctionType extends PrimitiveType {
  constructor() {
    super('function', 0)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    return undefined
  }

  override applyUnaryOperator(operator: string): DataType | undefined {
    return undefined
  }
}

export const PrimitiveTypes = {
  int: new IntType(),
  float: new FloatType(),
  void: new VoidType(),
  char: new CharType(),
  function: new FunctionType()
}
