export abstract class DataType {
  protected size: number

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

  isArrayType(): boolean {
    return false
  }

  isComplete(): boolean {
    return true
  }

  abstract toString(): string

  abstract canImplicitCastTo(targetType: DataType): boolean

  abstract canExplicitCastTo(targetType: DataType): boolean

  abstract applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined

  abstract applyUnaryOperator(operator: string): DataType | undefined

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

  protected assertIsComplete(): void {
    if (!this.isComplete()) {
      throw new Error('impossible execution path, imcomplete type')
    }
  }

  getSize(): number {
    this.assertIsComplete()
    return this.size
  }
}
