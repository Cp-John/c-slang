import { DataType, Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'
import { NumericLiteral } from '../expression/numericLiteral'
import { Function } from './function'

export interface RealBuiltinFunction {
  (env: Frame, rts: any[], context: any, args: (string | NumericLiteral)[]): void
}

export class BuiltinFunction extends Function {
  realFunction: RealBuiltinFunction

  constructor(
    returnType: DataType,
    functionName: string,
    realFunction: RealBuiltinFunction,
    arity: number = -1
  ) {
    super(returnType, functionName, arity)
    this.realFunction = realFunction
  }

  call(env: Frame, rts: any[], context: any, actualParameterList: Expression[]): void {
    const realParameterList: (string | NumericLiteral)[] = []
    actualParameterList.forEach(expr => {
      const val = expr.evaluate(env, rts, context)
      if (val == undefined) {
        throw new Error('impossible execution path')
      }
      realParameterList.push(val)
    })
    this.realFunction(env, rts, context, realParameterList)
  }

  isDefined(): boolean {
    return true
  }
}
