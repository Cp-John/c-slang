import { DataType } from '../../interpreter/builtins'
import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { NumericLiteral } from '../expression/numericLiteral'

export abstract class Function {
  returnType: DataType
  functionName: string

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

  protected checkTooFewArguments(lexer: Lexer) {
    if (lexer.matchDelimiter(')')) {
      throw new Error(
        lexer.formatError("'too few arguments in call to '" + this.functionName + "'")
      )
    }
  }

  protected checkTooManyArguments(lexer: Lexer) {
    if (!lexer.matchDelimiter(')')) {
      throw new Error(
        lexer.formatError("too many arguments in call to '" + this.functionName + '"')
      )
    }
  }

  abstract parseActualParameters(env: Frame, lexer: Lexer): Expression[]

  abstract toString(): string
}
