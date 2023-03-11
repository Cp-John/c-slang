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
  PRE_INCREMENT = 'PRE_INCREMENT',
  POST_INCREMENT = 'POST_INCREMENT',
  PRE_DECREMENT = 'PRE_DECREMENT',
  POST_DECREMENT = 'POST_DECREMENT'
}

export class Expression {
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

  evaluate(): number | undefined {
    const result: number[] = []
    let i = 0
    while (i < this.elements.length) {
      const ele = this.elements[i]
      if (ele instanceof Jump) {
        const jump = ele as Jump
        if (
          jump.condition == undefined ||
          jump.condition == Expression.numberToBoolean(result[result.length - 1])
        ) {
          if (jump.condition != undefined) {
            result[result.length - 1] = Expression.booleanToNumber(
              Expression.numberToBoolean(result[result.length - 1])
            )
          }
          i = jump.toPosition
          continue
        }
      } else if (ele instanceof FunctionCall) {
        throw new Error('function call has not been supported yet')
      } else if (typeof ele == 'number') {
        result.push(ele)
      } else if (ele in Expression.BINARY_OPERATORS) {
        result.push(Expression.BINARY_OPERATORS[ele](result.pop(), result.pop()))
      } else if (ele in Expression.UNARY_OPERATORS) {
        result.push(Expression.UNARY_OPERATORS[ele](result.pop()))
      } else {
        throw new Error('variable has not been supported yet')
      }
      i++
    }
    if (result.length > 0) {
      return result[0] as number
    }
    return undefined
  }
}
