import { Frame } from '../../interpreter/frame'
import { Function } from '../function/function'
import { Expression } from './expression'

export class FunctionCall {
  private functionName: string
  private actualParameterList: Expression[]

  constructor(functionName: string, actualParameterList: Expression[]) {
    this.functionName = functionName
    this.actualParameterList = actualParameterList
  }

  execute(env: Frame, rts: Frame[]): void {
    ;(env.lookup(this.functionName) as Function).call(env, rts, this.actualParameterList)
  }
}
