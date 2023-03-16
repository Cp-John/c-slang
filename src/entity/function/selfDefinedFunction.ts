import { DataType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Block } from '../block'
import { Expression } from '../expression/expression'
import { NumericLiteral } from '../expression/numericLiteral'
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

  call(env: Frame, rts: any[], context: any, actualParameterList: Expression[]) {
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
    const newEnv = Frame.extend(env)
    this.parameterList.forEach(pair => newEnv.declare(pair[1], pair[0]))
    actualParameterList.forEach((expr, index) =>
      newEnv.assignValue(
        this.parameterList[index][1],
        expr.evaluate(env, rts, context) as NumericLiteral
      )
    )
    try {
      this.body.execute(newEnv, rts, context)
    } catch (err) {
      if (err != 'RETURN') {
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
      actualParameters.push(Function.parseParameterWithType(env, lexer, pair[0]))
    })
    this.checkTooManyArguments(lexer)
    lexer.eatDelimiter(')')
    return actualParameters
  }
}
