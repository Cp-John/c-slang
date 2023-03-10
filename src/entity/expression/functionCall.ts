import { Expression } from './expression'

export class FunctionCall {
  private functionName: string
  private actualParameterList: Expression[]

  constructor(functionName: string, actualParameterList: Expression[]) {
    this.functionName = functionName
    this.actualParameterList = actualParameterList
  }
}
