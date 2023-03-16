import { DataType, Frame, PLACEHOLDER_REGEX } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Function } from './function'

export interface RealBuiltinFunction {
  (env: Frame, rts: any[], context: any, args: (string | NumericLiteral)[]): void
}

export class BuiltinFunction extends Function {
  private realFunction: RealBuiltinFunction
  private parameterTypes: DataType[]
  private isFormatString: boolean

  constructor(
    returnType: DataType,
    functionName: string,
    parameterTypes: DataType[],
    realFunction: RealBuiltinFunction,
    isFormatString: boolean = false
  ) {
    super(returnType, functionName)
    this.parameterTypes = parameterTypes
    this.realFunction = realFunction
    this.isFormatString = isFormatString
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

  private parseFormatStringParameters(
    env: Frame,
    lexer: Lexer,
    stringLiteral: string
  ): Expression[] {
    let formatString = stringLiteral.substring(1, stringLiteral.length - 1)
    let match = PLACEHOLDER_REGEX.exec(formatString)
    const formatStringParameters: Expression[] = []
    while (match != null) {
      this.checkTooFewArguments(lexer)
      lexer.eatDelimiter(',')
      if (
        match[0] == '%d' ||
        match[0] == '%ld' ||
        match[0] == '%f' ||
        match[0] == '%lf' ||
        match[0] == '%c'
      ) {
        formatStringParameters.push(ExpressionParser.parse(env, lexer, false, false, false))
      } else {
        if (!lexer.matchDelimiter('"')) {
          lexer.eatStringLiteral()
        } else {
          formatStringParameters.push(ExpressionParser.parse(env, lexer, true, false, false))
        }
      }
      formatString = formatString.replace(match[0], '0')
      match = PLACEHOLDER_REGEX.exec(formatString)
    }
    return formatStringParameters
  }

  parseActualParameters(env: Frame, lexer: Lexer): Expression[] {
    const actualParameters: Expression[] = []
    lexer.eatDelimiter('(')
    this.parameterTypes.forEach((type, index) => {
      this.checkTooFewArguments(lexer)
      if (index != 0) {
        lexer.eatDelimiter(',')
      }
      actualParameters.push(Function.parseParameterWithType(env, lexer, type))
    })
    if (this.isFormatString) {
      this.parseFormatStringParameters(env, lexer, actualParameters[0].toStringLiteral()).forEach(
        param => actualParameters.push(param)
      )
    }
    this.checkTooManyArguments(lexer)
    lexer.eatDelimiter(')')
    return actualParameters
  }
}
