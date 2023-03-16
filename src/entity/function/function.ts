import { DataType, Frame } from '../../interpreter/frame'
import { Expression } from '../expression/expression'

export abstract class Function {
  returnType: DataType
  functionName: string
  arity: number

  constructor(returnType: DataType, functionName: string, arity: number) {
    this.returnType = returnType
    this.functionName = functionName
    this.arity = arity
  }

  abstract call(env: Frame, rts: any[], context: any, actualParameterList: Expression[]): void

  abstract isDefined(): boolean
}
