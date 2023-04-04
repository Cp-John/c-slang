import { DataType } from './dataType'
import { PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscriptableType'

export class PointerType extends SubscriptableType {
  private pointingTo: DataType

  constructor(pointingTo: DataType) {
    super(4)
    this.pointingTo = pointingTo
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    if (operator != '+' && operator != '-') {
      return undefined
    } else if (rightType.isWholePrimitiveType()) {
      return this
    } else {
      return operator == '-' && rightType.toString() == this.toString()
        ? PrimitiveTypes.int
        : undefined
    }
  }

  override isPointer(): boolean {
    return true
  }

  override dereference(): DataType {
    return this.pointingTo
  }

  toString(): string {
    return this.pointingTo.toString() + '*'
  }

  canImplicitCastTo(targetType: DataType): boolean {
    return (
      this.toString() == targetType.toString() || targetType == new PointerType(PrimitiveTypes.void)
    )
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return targetType instanceof PointerType || targetType == PrimitiveTypes.int
  }
}
