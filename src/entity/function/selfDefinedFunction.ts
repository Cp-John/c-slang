import { Frame, VariableType } from '../../interpreter/frame'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { Function } from './function'

export class SelfDefinedFunction extends Function {
  private parameterList: [string, string][]
  body: Block | null

  constructor(
    returnType: string,
    functionName: string,
    parameterList: [string, string][],
    body: Block | null
  ) {
    super(returnType, functionName, parameterList.length)
    this.parameterList = parameterList
    this.body = body
  }

  call(env: Frame, rts: any[], context: any, actualParameterList: Expression[]) {
    if (this.body == null) {
      throw new Error("function '" + this.functionName + "' has no definition yet")
    }
    if (actualParameterList.length != this.parameterList.length) {
      throw new Error(
        'expected ' +
          String(this.parameterList.length) +
          ' parameters, but got ' +
          String(actualParameterList.length)
      )
    }
    const newEnv = Frame.extend(env)
    this.parameterList.forEach(pair => newEnv.declare(pair[1], VariableType.NUMBER))
    actualParameterList.forEach((expr, index) =>
      newEnv.assignValue(this.parameterList[index][1], expr.evaluate(env, rts, context))
    )
    this.body.execute(newEnv, rts, context)
  }
}
