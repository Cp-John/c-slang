import { Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'
import { Function } from './function'

export class BuiltinFunction extends Function {
  realFunction

  constructor(returnType: string, functionName: string, realFunction: any) {
    super(returnType, functionName)
    this.realFunction = realFunction
  }

  call(env: Frame, rts: Frame[], context: any, actualParameterList: Expression[]): void {
    const realParameterList: (string | number | undefined)[] = []
    actualParameterList.forEach(expr => realParameterList.push(expr.evaluate(env, rts, context)))
    this.realFunction(env, rts, context, realParameterList)
  }
}
