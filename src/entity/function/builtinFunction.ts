import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { PLACEHOLDER_REGEX } from '../constant'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveTypes } from '../datatype/primitiveType'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Function } from './function'

export interface RealBuiltinFunction {
  (env: Frame, context: CProgramContext, args: NumericLiteral[]): void | NumericLiteral
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

  call(
    env: Frame,
    context: CProgramContext,
    actualParameterList: NumericLiteral[]
  ): void | NumericLiteral {
    return this.realFunction(env, context, actualParameterList)
  }

  isDefined(): boolean {
    return true
  }

  override isTerminatingBlock(): boolean {
    return this.functionName == 'exit'
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
      if (match[0] == '%d' || match[0] == '%ld') {
        expectedType = PrimitiveTypes.int
      } else if (match[0] == '%f' || match[0] == '%lf') {
        expectedType = PrimitiveTypes.float
      } else if (match[0] == '%c') {
        expectedType = PrimitiveTypes.char
      } else if (match[0] == '%s') {
        expectedType = new PointerType(PrimitiveTypes.char)
      } else if (match[0] == '%p') {
        expectedType = new PointerType(PrimitiveTypes.void)
      } else {
        throw new Error('impossible execution path')
      }
      if (this.isAddress && expectedType != null && !(expectedType instanceof PointerType)) {
        expectedType = new PointerType(expectedType)
      }
      formatStringParameters.push(
        ExpressionParser.parse(env, lexer, false, false, expectedType, false)
      )
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
      actualParameters.push(ExpressionParser.parse(env, lexer, false, false, type, false))
    })
    if (!this.isFormatString) {
      lexer.eatDelimiter(')')
      return actualParameters
    }
    if (actualParameters[0].isImmediateString()) {
      this.parseFormatStringParameters(env, lexer, actualParameters[0].toImmediateString()).forEach(
        param => actualParameters.push(param)
      )
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
