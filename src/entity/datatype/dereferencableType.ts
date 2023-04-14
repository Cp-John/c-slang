import { DataType } from './dataType'

export abstract class DereferencableType extends DataType {
  override isDereferencable(): boolean {
    return true
  }

  abstract dereference(): DataType
}
