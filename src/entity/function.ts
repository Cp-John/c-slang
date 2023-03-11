import { Frame } from '../interpreter/frame'
import { Block } from './block'
import { Expression } from './expression/expression'

export class Function {
  private returnType: string
  private functionName: string
  private parameterList: [string, string][]
  private body: Block

  constructor(
    returnType: string,
    functionName: string,
    parameterList: [string, string][],
    body: Block
  ) {
    this.returnType = returnType
    this.functionName = functionName
    this.parameterList = parameterList
    this.body = body
  }

  call(env: Frame, rts: Frame[], actualParameterList: Expression[]) {
    if (actualParameterList.length != this.parameterList.length) {
      throw new Error(
        'expected ' +
          String(this.parameterList.length) +
          ' parameters, but got ' +
          String(actualParameterList.length)
      )
    }
    const newEnv = Frame.extend(env)
    this.parameterList.forEach(pair => newEnv.declare(pair[1]))
    actualParameterList.forEach((expr, index) =>
      newEnv.assignValue(this.parameterList[index][1], expr.evaluate(env, rts))
    )
    this.body.execute(newEnv, rts)
  }
}
