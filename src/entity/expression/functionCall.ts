import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Function } from '../function/function'
import { Expression } from './expression'

export class FunctionCall {
  private functionObj: Function
  private actualParameterList: Expression[]
  private static calledFunctions: Set<string> = new Set<string>()

  static clearCalledFunctions(): void {
    FunctionCall.calledFunctions.clear()
  }

  static checkCalledFunctionDefinition(env: Frame): void {
    FunctionCall.calledFunctions.forEach(functionName => {
      if (!env.isFunctionDefined(functionName)) {
        throw new Error("called function '" + functionName + "' has no definition yet")
      }
    })
  }

  constructor(env: Frame, functionName: string, actualParameterList: Expression[]) {
    this.functionObj = env.lookupFunction(functionName)
    FunctionCall.calledFunctions.add(functionName)
    this.actualParameterList = actualParameterList
  }

  getReturnType(env: Frame): DataType {
    return this.functionObj.returnType
  }

  execute(env: Frame, rts: any[], context: any): void {
    env
      .lookupFunction(this.functionObj.functionName)
      .call(env, rts, context, this.actualParameterList)
  }
}
