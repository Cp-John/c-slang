import { Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'

export abstract class Function {
  protected returnType: string
  protected functionName: string

  constructor(returnType: string, functionName: string) {
    this.returnType = returnType
    this.functionName = functionName
  }

  abstract call(env: Frame, rts: Frame[], context: any, actualParameterList: Expression[]): void
}
