import { DataType } from '../../interpreter/builtins'
import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Function } from '../function/function'
import { Expression } from './expression'
import { NumericLiteral } from './numericLiteral'

export class FunctionCall {
  private functionObj: Function
  private actualParameterList: Expression[]
  private static calledFunctions: Set<string> = new Set<string>()
  private row: number

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

  constructor(env: Frame, functionName: string, actualParameterList: Expression[], row: number) {
    this.functionObj = env.lookupFunction(functionName)
    FunctionCall.calledFunctions.add(functionName)
    this.actualParameterList = actualParameterList
    this.row = row
  }

  getReturnType(): DataType {
    return this.functionObj.returnType
  }

  execute(env: Frame, context: CProgramContext): void | NumericLiteral {
    const parameters: NumericLiteral[] = []
    this.actualParameterList.forEach(expr =>
      parameters.push(expr.evaluate(env, context) as NumericLiteral)
    )
    return env.lookupFunction(this.functionObj.functionName).call(env, context, parameters)
  }
}
