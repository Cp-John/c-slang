import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { FunctionCall } from './functionCall'

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
      env.assignValue(identifier, env.lookup(identifier) + 1),
    $POST_INCREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookup(identifier) + 1) - 1,
    $PRE_DECREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookup(identifier) - 1),
    $POST_DECREMENT: (identifier: string, env: Frame) =>
      env.assignValue(identifier, env.lookup(identifier) - 1) + 1
  }

  public static readonly ASSIGNMENT_OPERATORS = {
    '=': (right: number, left: string, env: Frame) => env.assignValue(left, right),
    '+=': (right: number, left: string, env: Frame) =>
      env.assignValue(left, env.lookup(left) + right),
    '-=': (right: number, left: string, env: Frame) =>
      env.assignValue(left, env.lookup(left) - right),
    '*=': (right: number, left: string, env: Frame) =>
      env.assignValue(left, env.lookup(left) * right),
    '/=': (right: number, left: string, env: Frame) =>
      env.assignValue(left, env.lookup(left) / right),
    '%=': (right: number, left: string, env: Frame) =>
      env.assignValue(left, env.lookup(left) % right)
  }

  private static readonly BINARY_OPERATORS = {
    '+': (right: number, left: number) => left + right,
    '-': (right: number, left: number) => left - right,
    '*': (right: number, left: number) => left * right,
    '/': (right: number, left: number) => left / right,
    '%': (right: number, left: number) => left % right,
    '<': (right: number, left: number) => this.booleanToNumber(left < right),
    '<=': (right: number, left: number) => this.booleanToNumber(left <= right),
    '>': (right: number, left: number) => this.booleanToNumber(left > right),
    '>=': (right: number, left: number) => this.booleanToNumber(left >= right),
    '==': (right: number, left: number) => this.booleanToNumber(left == right),
    '!=': (right: number, left: number) => this.booleanToNumber(left != right),
    '&&': (right: number, left: number) =>
      this.booleanToNumber(this.numberToBoolean(left) && this.numberToBoolean(right)),
    '||': (right: number, left: number) =>
      this.booleanToNumber(this.numberToBoolean(left) || this.numberToBoolean(right))
  }

  private static readonly UNARY_OPERATORS = {
    '!': (val: number) => this.booleanToNumber(!this.numberToBoolean(val))
  }

  private elements: (string | number | IncrementDecrement | FunctionCall | Jump)[]

  constructor(elements: (string | number | IncrementDecrement | FunctionCall | Jump)[]) {
    this.elements = elements
  }

  isIdentifier(): boolean {
    return (
      this.elements.length == 1 &&
      typeof this.elements[0] == 'string' &&
      new Lexer(this.elements[0]).matchIdentifier()
    )
  }

  toIdentifier(): string {
    if (!this.isIdentifier()) {
      throw new Error(String(this.elements) + ' is not an identifier')
    }

    return this.elements[0] as string
  }

  private static numberToBoolean(ele: number): boolean {
    return !(ele == 0)
  }

  private static booleanToNumber(val: boolean): number {
    return val ? 1 : 0
  }

  private static toNumber(val: number | string | undefined, env: Frame): number {
    if (val == undefined) {
      throw new Error('undefined operand')
    }
    if (typeof val == 'string') {
      return env.lookup(val)
    }
    return val
  }

  evaluate(env: Frame, rts: Frame[]): number | string | undefined {
    const result: (number | string)[] = []
    let i = 0
    while (i < this.elements.length) {
      const ele = this.elements[i]
      if (ele instanceof Jump) {
        const jump = ele as Jump
        if (
          jump.condition == undefined ||
          jump.condition ==
            Expression.numberToBoolean(Expression.toNumber(result[result.length - 1], env))
        ) {
          if (jump.condition != undefined) {
            result[result.length - 1] = Expression.booleanToNumber(
              Expression.numberToBoolean(Expression.toNumber(result[result.length - 1], env))
            )
          }
          i = jump.toPosition
          continue
        }
      } else if (ele instanceof FunctionCall) {
        ele.execute(env, rts)
      } else if (typeof ele == 'number') {
        result.push(ele)
      } else if (ele in Expression.INCREMENT_DECREMENT_OPERATORS) {
        result.push(Expression.INCREMENT_DECREMENT_OPERATORS[ele](result.pop(), env))
      } else if (ele in Expression.BINARY_OPERATORS) {
        result.push(
          Expression.BINARY_OPERATORS[ele](
            Expression.toNumber(result.pop(), env),
            Expression.toNumber(result.pop(), env)
          )
        )
      } else if (ele == '&') {
        result.push('"' + result.pop() + '"')
      } else if (ele in Expression.UNARY_OPERATORS) {
        result.push(Expression.UNARY_OPERATORS[ele](Expression.toNumber(result.pop(), env)))
      } else if (ele in Expression.ASSIGNMENT_OPERATORS) {
        result.push(
          Expression.ASSIGNMENT_OPERATORS[ele](
            Expression.toNumber(result.pop(), env),
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
    if (val == undefined || typeof val == 'number' || new Lexer(val).matchStringLiteral()) {
      return val
    } else {
      return env.lookup(val)
    }
  }
}
