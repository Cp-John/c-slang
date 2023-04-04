import { DataType } from './dataType'
import { PrimitiveTypes } from './primitiveType'
import { SubscriptableType } from './subscritableType'

export class PointerType extends SubscriptableType {
  private pointingTo: any

  constructor(pointingTo: any) {
    super(4)
    this.pointingTo = pointingTo
  }

  override applyBinaryOperator(operator: string, leftType: DataType): DataType | undefined {
    if (operator != '+' && operator != '-') {
      return undefined
    } else if (leftType.isWholePrimitiveType()) {
      return this
    } else {
      return operator == '-' && leftType.toString() == this.toString()
        ? PrimitiveTypes.int
        : undefined
    }
  }

  override isPointer(): boolean {
    return true
  }

  override dereference(): any {
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

  canExplicitCastTo(targetType: DataType): boolean {
    return targetType instanceof PointerType || targetType == PrimitiveTypes.int
  }
}
