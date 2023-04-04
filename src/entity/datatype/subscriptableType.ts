import { DataType } from './dataType'

export abstract class SubscriptableType extends DataType {
  override isSubscriptable(): boolean {
    return true
  }

  abstract dereference(): DataType
}
