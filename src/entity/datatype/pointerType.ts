import { DataType, RELATIONAL_OPERATORS } from './dataType'
import { PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscriptableType'

export class PointerType extends SubscriptableType {
  private pointingTo: DataType

  constructor(pointingTo: DataType) {
    super(4)
    this.pointingTo = pointingTo
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (RELATIONAL_OPERATORS.has(operator)) {
      return rightType.isPointerType() ? PrimitiveTypes.int : undefined
    } else if (operator != '+' && operator != '-') {
      return undefined
    } else if (rightType.isWholePrimitiveType()) {
      return this
    } else {
      return operator == '-' && rightType.toString() == this.toString()
        ? PrimitiveTypes.int
        : undefined
    }
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
