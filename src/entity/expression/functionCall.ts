import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { DataType } from '../datatype/dataType'
import { Function } from '../function/function'
import { Expression } from './expression'
import { NumericLiteral } from './numericLiteral'

export class FunctionCall {
  private functionObj: Function
  private actualParameterList: Expression[]
  private static calledFunctions: Map<string, [number, number]> = new Map<
    string,
    [number, number]
  >()

  static clearCalledFunctions(): void {
    FunctionCall.calledFunctions.clear()
  }

  static checkCalledFunctionDefinition(env: Frame, lexer: Lexer): void {
    FunctionCall.calledFunctions.forEach(([row, col], functionName) => {
      if (!env.isFunctionDefined(functionName)) {
        throw new Error(
          lexer.formatError(
            "called function '" + functionName + "' has no definition yet",
            row,
            col
          )
        )
      }
    })
  }

  constructor(
    env: Frame,
    functionName: string,
    actualParameterList: Expression[],
    row: number,
    col: number
  ) {
    this.functionObj = env.lookupFunction(functionName)
    if (!FunctionCall.calledFunctions.has(functionName)) {
      FunctionCall.calledFunctions.set(functionName, [row, col])
    }
    this.actualParameterList = actualParameterList
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
