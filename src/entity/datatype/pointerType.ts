import { RELATIONAL_OPERATORS } from '../constant'
import { ArrayType } from './arrayType'
import { DataType } from './dataType'
import { DereferencableType } from './dereferencableType'
import { PrimitiveTypes } from './primitiveType'

export class PointerType extends DereferencableType {
  private pointingTo: DataType

  constructor(pointingTo: DataType) {
    super(4)
    this.pointingTo = pointingTo
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    let rightTypeStr = rightType.toString()
    if (rightType.isArrayType()) {
      rightTypeStr = (rightType as ArrayType).toPointerType().toString()
    }
    if (RELATIONAL_OPERATORS.has(operator)) {
      return rightTypeStr == this.toString() ||
        rightTypeStr == new PointerType(PrimitiveTypes.void).toString()
        ? PrimitiveTypes.int
        : undefined
    } else if (operator == '||' || operator == '&&') {
      return rightType.isDereferencable() || rightType.isArithPrimitiveType()
        ? PrimitiveTypes.int
        : undefined
    } else if (operator != '+' && operator != '-') {
      return undefined
    } else if (rightType.isWholePrimitiveType()) {
      return this
    } else {
      return operator == '-' && rightTypeStr == this.toString() ? PrimitiveTypes.int : undefined
    }
  }

  override applyUnaryOperator(operator: string): DataType | undefined {
    if (operator == '!') {
      return PrimitiveTypes.int
    }
    return undefined
  }

  override isPointerType(): boolean {
    return true
  }

  override dereference(): DataType {
    return this.pointingTo
  }

  toString(): string {
    return this.pointingTo.toString() + '*'
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() ||
      targetType.toString() == new PointerType(PrimitiveTypes.void).toString() ||
      (this.dereference() == PrimitiveTypes.void && targetType.isPointerType())
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return targetType.isPointerType() || targetType == PrimitiveTypes.int
  }
}
