import { Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'
import { Function } from './function'

export class BuiltinFunction extends Function {
  realFunction

  constructor(returnType: string, functionName: string, realFunction: any, arity: number = -1) {
    super(returnType, functionName, arity)
    this.realFunction = realFunction
  }

  call(env: Frame, rts: any[], context: any, actualParameterList: Expression[]): void {
    const realParameterList: (string | number | undefined)[] = []
    actualParameterList.forEach(expr => realParameterList.push(expr.evaluate(env, rts, context)))
    this.realFunction(env, rts, context, realParameterList)
  }
}
