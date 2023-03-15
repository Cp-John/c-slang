import { DATA_TYPES, DataType, Frame } from '../../interpreter/frame'
import { FunctionCall } from './functionCall'
import { NumericLiteral } from './numericLiteral'

export class Jump {
  condition: boolean | undefined
  toPosition: number

  constructor(condition: boolean | undefined = undefined, toPosition: number = 0) {
    this.condition = condition
    this.toPosition = toPosition
  }
}

export enum IncrementDecrement {
  PRE_INCREMENT = '$PRE_INCREMENT',
  POST_INCREMENT = '$POST_INCREMENT',
  PRE_DECREMENT = '$PRE_DECREMENT',
  POST_DECREMENT = '$POST_DECREMENT'
}

export class Expression {
  private static readonly INCREMENT_DECREMENT_OPERATORS = {
    $PRE_INCREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookupNumber(identifier).increment()),
    $POST_INCREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookupNumber(identifier).increment()).decrement(),
    $PRE_DECREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookupNumber(identifier).decrement()),
    $POST_DECREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookupNumber(identifier).decrement()).increment()
  }

  public static readonly ASSIGNMENT_OPERATORS = {
    '=': (right: NumericLiteral, left: string, env: Frame) => env.assignValue(left, right),
    '+=': (right: NumericLiteral, left: string, env: Frame) =>
      env.assignValue(left, env.lookupNumber(left).plus(right)),
    '-=': (right: NumericLiteral, left: string, env: Frame) =>
      env.assignValue(left, env.lookupNumber(left).minus(right)),
    '*=': (right: NumericLiteral, left: string, env: Frame) =>
      env.assignValue(left, env.lookupNumber(left).multiply(right)),
    '/=': (right: NumericLiteral, left: string, env: Frame) =>
      env.assignValue(left, env.lookupNumber(left).divideBy(right)),
    '%=': (right: NumericLiteral, left: string, env: Frame) =>
      env.assignValue(left, env.lookupNumber(left).modulo(right))
  }

  private elements: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[]

  constructor(elements: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[]) {
    this.elements = elements
  }

  assignTo(variableName: string): Expression {
    let newElements: (string | NumericLiteral | FunctionCall | Jump)[] = [variableName]
    newElements = newElements.concat(this.elements)
    newElements.push('=')
    return new Expression(newElements)
  }

  private static toNumberLiteral(
    val: NumericLiteral | string | undefined,
    env: Frame
  ): NumericLiteral {
    if (val == undefined) {
      throw new Error('undefined operand')
    } else if (typeof val == 'string') {
      return env.lookupNumber(val)
    } else {
      return val
    }
  }

  evaluate(env: Frame, rts: any[], context: any): NumericLiteral | string | undefined {
    const result: (NumericLiteral | string | undefined)[] = []
    let i = 0
    while (i < this.elements.length) {
      const ele = this.elements[i]
      if (ele instanceof Jump) {
        const jump = ele as Jump
        if (
          jump.condition == undefined ||
          jump.condition == Expression.toNumberLiteral(result[result.length - 1], env).toBoolean()
        ) {
          if (jump.condition != undefined) {
            result[result.length - 1] = NumericLiteral.booleanToNumericLiteral(
              Expression.toNumberLiteral(result[result.length - 1], env).toBoolean()
            )
          }
          i = jump.toPosition
          continue
        }
      } else if (ele instanceof FunctionCall) {
        ele.execute(env, rts, context)
        if (ele.getReturnType(env) != DataType.VOID) {
          result.push(rts.pop())
        }
      } else if (ele instanceof NumericLiteral) {
        result.push(ele)
      } else if (DATA_TYPES.includes(ele as DataType)) {
        result.push(Expression.toNumberLiteral(result.pop(), env).castToType(ele as DataType))
      } else if (ele in Expression.INCREMENT_DECREMENT_OPERATORS) {
        result.push(Expression.INCREMENT_DECREMENT_OPERATORS[ele](result.pop(), env))
      } else if (NumericLiteral.BINARY_ARITHMETIC_OPERATORS.has(ele)) {
        const operator = NumericLiteral.BINARY_ARITHMETIC_OPERATORS.get(ele)
        if (!operator) {
          throw new Error('impossible execution path')
        }
        result.push(
          operator(
            Expression.toNumberLiteral(result.pop(), env),
            Expression.toNumberLiteral(result.pop(), env)
          )
        )
      } else if (ele == '&') {
        result.push('"' + result.pop() + '"')
      } else if (NumericLiteral.UNARY_ARITHMETIC_OPERATORS.has(ele)) {
        result.push(
          NumericLiteral.UNARY_ARITHMETIC_OPERATORS.get(ele)?.apply(
            Expression.toNumberLiteral(result.pop(), env)
          )
        )
      } else if (ele in Expression.ASSIGNMENT_OPERATORS) {
        result.push(
          Expression.ASSIGNMENT_OPERATORS[ele](
            Expression.toNumberLiteral(result.pop(), env),
            result.pop(),
            env
          )
        )
      } else {
        result.push(ele)
      }
      i++
    }
    const val = result.pop()
    if (val == undefined || val instanceof NumericLiteral || val.startsWith('"')) {
      return val
    } else {
      return env.lookupNumber(val)
    }
  }
}
