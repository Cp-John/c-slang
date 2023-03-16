import { DataType, Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
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

  constructor(
    env: Frame,
    row: number,
    col: number,
    lexer: Lexer,
    functionName: string,
    actualParameterList: Expression[]
  ) {
    this.functionObj = env.lookupFunction(functionName)
    console.log('created function call:', functionName)
    FunctionCall.calledFunctions.add(functionName)
    console.log(FunctionCall.calledFunctions)
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

  getReturnType(env: Frame): DataType {
    return this.functionObj.returnType
  }

  execute(env: Frame, rts: any[], context: any): void {
    env
      .lookupFunction(this.functionObj.functionName)
      .call(env, rts, context, this.actualParameterList)
  }
}
