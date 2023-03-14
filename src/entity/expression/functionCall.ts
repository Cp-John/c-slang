import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Function } from '../function/function'
import { Expression } from './expression'

export class FunctionCall {
  private functionObj: Function
  private actualParameterList: Expression[]

  constructor(
    env: Frame,
    row: number,
    col: number,
    lexer: Lexer,
    functionName: string,
    actualParameterList: Expression[]
  ) {
    this.functionObj = env.lookup(functionName) as Function
    this.actualParameterList = actualParameterList
    if (this.functionObj.arity == -1 || this.functionObj.arity == actualParameterList.length) {
      return
    }
    if (actualParameterList.length < this.functionObj.arity) {
      throw new Error(
        lexer.formatError(
          'too few arguments to function call, expected ' +
            String(this.functionObj.arity) +
            ' have ' +
            String(this.actualParameterList.length),
          row,
          col
        )
      )
    } else {
      throw new Error(
        lexer.formatError(
          'too many arguments to function call, expected ' +
            String(this.functionObj.arity) +
            ' have ' +
            String(this.actualParameterList.length),
          row,
          col
        )
      )
    }
  }

  getReturnType(env: Frame) {
    return this.functionObj.returnType
  }

  execute(env: Frame, rts: any[], context: any): void {
    try {
      ;(env.lookup(this.functionObj.functionName) as Function).call(
        env,
        rts,
        context,
        this.actualParameterList
      )
    } catch (err: any) {
      if (err != 'RETURN') {
        throw err
      }
    }
  }
}
