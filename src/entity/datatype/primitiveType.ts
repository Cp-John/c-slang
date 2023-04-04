import { DataType } from './dataType'

export abstract class PrimitiveType extends DataType {
  private repr: string

  constructor(repr: string, size: number) {
    super(size)
    this.repr = repr
  }

  toString(): string {
    return this.repr
  }
}

abstract class ArithPrimitiveType extends PrimitiveType {
  static BOOL_BINARY_OPERATORS = new Set<string>(['==', '!=', '>=', '>', '<=', '<', '&&', '||'])

  override isArithPrimitiveType(): boolean {
    return true
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (!rightType.isArithPrimitiveType()) {
      return rightType.applyBinaryOperator(operator, this)
    } else if (ArithPrimitiveType.BOOL_BINARY_OPERATORS.has(operator)) {
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

  canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() ||
      targetType == PrimitiveTypes.float ||
      targetType == PrimitiveTypes.int
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return this.canImplicitCastTo(targetType) || targetType.isPointer()
  }
}

class FloatType extends ArithPrimitiveType {
  constructor() {
    super('float', 4)
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    console.log('casting float to ' + targetType.toString())
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
    return this.canImplicitCastTo(targetType) || targetType.isPointer()
  }
}

class VoidType extends PrimitiveType {
  constructor() {
    super('void', 1)
  }

  canImplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    return undefined
  }
}

class FunctionType extends PrimitiveType {
  constructor() {
    super('function', 0)
  }

  canImplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return false
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
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
