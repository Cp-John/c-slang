import { Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'

export abstract class Function {
  returnType: string
  protected functionName: string
  arity: number

  constructor(returnType: string, functionName: string, arity: number) {
    this.returnType = returnType
    this.functionName = functionName
    this.arity = arity
  }

  abstract call(env: Frame, rts: Frame[], context: any, actualParameterList: Expression[]): void
}
