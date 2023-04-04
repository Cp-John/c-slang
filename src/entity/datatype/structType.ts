import { DataType } from './dataType'

export class StructType extends DataType {
  private tag: string
  private fields: Map<string, [DataType, number]>

  constructor(tag: string, fields: Map<string, [DataType, number]>) {
    let size = 0
    fields.forEach(([fieldType, memOffset]) => {
      size += fieldType.getSize()
    })
    super(size)
    this.tag = tag
    this.fields = fields
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    return undefined
  }

  toString(): string {
    return 'struct ' + this.tag
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return this.toString() == targetType.toString()
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return this.toString() == targetType.toString()
  }
}
