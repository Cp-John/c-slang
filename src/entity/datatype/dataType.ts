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

  abstract toString(): string

  isPointer(): boolean {
    return false
  }

  abstract canImplicitCastTo(targetType: DataType): boolean

  abstract canExplicitCastTo(targetType: DataType): boolean

  abstract applyBinaryOperator(operator: string, leftType: DataType): DataType | undefined

  getSize(): number {
    return this.size
  }
}
