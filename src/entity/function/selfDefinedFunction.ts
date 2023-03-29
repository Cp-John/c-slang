import { DataType, PrimitiveType } from '../../interpreter/builtins'
import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
import { Return } from '../statement/return'
import { Function } from './function'

export class SelfDefinedFunction extends Function {
  private parameterList: [DataType, string][]
  body: Block | null

  constructor(
    returnType: DataType,
    functionName: string,
    parameterList: [DataType, string][],
    body: Block | null
  ) {
    super(returnType, functionName)
    this.parameterList = parameterList
    this.body = body
  }

  isDefined(): boolean {
    return this.body != null
  }

  call(
    env: Frame,
    context: CProgramContext,
    actualParameterList: NumericLiteral[]
  ): void | NumericLiteral {
    if (this.body == null) {
      throw new Error("function '" + this.functionName + "' has no definition yet")
    }
    if (actualParameterList.length != this.parameterList.length) {
      throw new Error(
        'expected ' +
          String(this.parameterList.length) +
          ' parameters, but got ' +
          String(actualParameterList.length)
      )
    }
    const newEnv = Frame.extendWithStackTop(context.baseFrame, env.getStackTop())
    this.parameterList.forEach(pair => newEnv.declare(pair[1], pair[0]))
    actualParameterList.forEach((val, index) =>
      newEnv.assignValue(this.parameterList[index][1], val)
    )
    try {
      this.body.execute(newEnv, context)
      if (this.returnType != PrimitiveType.VOID) {
        return NumericLiteral.new(0).castToType(this.returnType)
      }
    } catch (err) {
      if (err instanceof Return) {
        if (this.returnType != PrimitiveType.VOID) {
          return err.getEvaluated()
        }
      } else {
        throw err
      }
    }
  }

  parseActualParameters(env: Frame, lexer: Lexer): Expression[] {
    const actualParameters: Expression[] = []
    lexer.eatDelimiter('(')
    this.parameterList.forEach((pair, index) => {
      this.checkTooFewArguments(lexer)
      if (index != 0) {
        lexer.eatDelimiter(',')
      }
      actualParameters.push(ExpressionParser.parse(env, lexer, false, false, pair[0]))
    })
    this.checkTooManyArguments(lexer)
    lexer.eatDelimiter(')')
    return actualParameters
  }

  toString(): string {
    let result = this.returnType.toString() + ' ' + this.functionName + '('
    if (this.parameterList.length > 0) {
      result += this.parameterList[0][0].toString()
      for (let i = 1; i < this.parameterList.length; i++) {
        result += ', ' + this.parameterList[i][0].toString()
      }
    }
    return result + ')'
  }
}
