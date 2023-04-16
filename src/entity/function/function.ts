import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { DataType } from '../datatype/dataType'
import { Expression } from '../expression/expression'
import { NumericLiteral } from '../expression/numericLiteral'

export abstract class Function {
  protected returnType: DataType
  protected functionName: string

  constructor(returnType: DataType, functionName: string) {
    this.returnType = returnType
    this.functionName = functionName
  }

  abstract call(
    env: Frame,
    context: CProgramContext,
    actualParameterList: NumericLiteral[]
  ): void | NumericLiteral

  abstract isDefined(): boolean

  isTerminatingBlock(): boolean {
    return false
  }

  protected checkTooFewArguments(lexer: Lexer) {
    if (lexer.matchDelimiter(')')) {
      throw new Error(lexer.formatError("too few arguments in call to '" + this.functionName + "'"))
    }
  }

  getReturnType(): DataType {
    return this.returnType
  }

  getFunctionName(): string {
    return this.functionName
  }

  abstract parseActualParameters(env: Frame, lexer: Lexer): Expression[]

  abstract toString(): string
}
