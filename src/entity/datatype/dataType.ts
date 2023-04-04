export abstract class DataType {
  private size: number

  constructor(size: number) {
    this.size = size
  }

  isSubscriptable(): boolean {
    return false
  }

  isArithPrimitiveType(): boolean {
    return false
  }

  isWholePrimitiveType(): boolean {
    return false
  }

  isPointerType(): boolean {
    return false
  }

  abstract toString(): string

  abstract canImplicitCastTo(targetType: DataType): boolean

  abstract canExplicitCastTo(targetType: DataType): boolean

  abstract applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined

  getResultType(operator: string, rightType: DataType): DataType {
    const resultType = this.applyBinaryOperator(operator, rightType)
    if (resultType == undefined) {
      throw new Error(
        "attempting to apply operator '" +
          operator +
          "' to type '" +
          this +
          "' and '" +
          rightType +
          "'"
      )
    }
    return resultType
  }

  getSize(): number {
    return this.size
  }
}
