import { DataType, PLACEHOLDER_REGEX, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Function } from './function'

export interface RealBuiltinFunction {
  (env: Frame, context: any, args: NumericLiteral[]): void | NumericLiteral
}

export class BuiltinFunction extends Function {
  private realFunction: RealBuiltinFunction
  private parameterTypes: DataType[]
  private isFormatString: boolean
  private isAddress: boolean

  constructor(
    returnType: DataType,
    functionName: string,
    parameterTypes: DataType[],
    realFunction: RealBuiltinFunction,
    isAddress: boolean = false,
    isFormatString: boolean = false
  ) {
    super(returnType, functionName)
    this.parameterTypes = parameterTypes
    this.realFunction = realFunction
    this.isAddress = isAddress
    this.isFormatString = isFormatString
  }

  call(env: Frame, context: any, actualParameterList: NumericLiteral[]): void | NumericLiteral {
    const realParameterList: NumericLiteral[] = []
    actualParameterList.forEach(val => realParameterList.push(val))
    return this.realFunction(env, context, realParameterList)
  }

  isDefined(): boolean {
    return true
  }

  private parseFormatStringParameters(
    env: Frame,
    lexer: Lexer,
    formatString: string
  ): Expression[] {
    let match = PLACEHOLDER_REGEX.exec(formatString)
    const formatStringParameters: Expression[] = []
    while (match != null) {
      this.checkTooFewArguments(lexer)
      lexer.eatDelimiter(',')
      let expectedType: DataType | null
      const isPointer = false
      if (match[0] == '%d' || match[0] == '%ld') {
        expectedType = PrimitiveType.INT
      } else if (match[0] == '%f' || match[0] == '%lf') {
        expectedType = PrimitiveType.FLOAT
      } else if (match[0] == '%c') {
        expectedType = PrimitiveType.CHAR
      } else if (match[0] == '%s') {
        expectedType = new PointerType(PrimitiveType.CHAR)
      } else if (match[0] == '%p') {
        expectedType = new PointerType(PrimitiveType.VOID)
      } else {
        throw new Error('impossible execution path')
      }
      if (this.isAddress && expectedType != null && !(expectedType instanceof PointerType)) {
        expectedType = new PointerType(expectedType)
      }
      formatStringParameters.push(ExpressionParser.parse(env, lexer, false, false, expectedType))
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
      actualParameters.push(ExpressionParser.parse(env, lexer, false, false, type))
    })
    if (!this.isFormatString) {
      this.checkTooManyArguments(lexer)
      lexer.eatDelimiter(')')
      return actualParameters
    }
    if (actualParameters[0].isImmediateString()) {
      this.parseFormatStringParameters(env, lexer, actualParameters[0].toImmediateString()).forEach(
        param => actualParameters.push(param)
      )
      this.checkTooManyArguments(lexer)
    } else {
      // TODO
      // actualParameters.push(ExpressionParser.parse(env, lexer, false, false, null))
      throw new Error('TODO: is not immediateString')
    }
    lexer.eatDelimiter(')')
    return actualParameters
  }

  toString(): string {
    let result = this.returnType.toString() + ' ' + this.functionName + '('
    if (this.isFormatString) {
      result += 'char*, ...any'
    } else if (this.parameterTypes.length > 0) {
      result += this.parameterTypes[0].toString()
      for (let i = 1; i < this.parameterTypes.length; i++) {
        result += ', ' + this.parameterTypes[i].toString()
      }
    }
    return result + ')'
  }
}
