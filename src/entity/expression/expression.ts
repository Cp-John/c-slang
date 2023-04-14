import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { DEREFERENCE_TAG, STRUCT_MEMBER_ACCESS_TAG } from '../constant'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../datatype/primitiveType'
import { StructType } from '../datatype/structType'
import { FunctionCall } from './functionCall'
import { NumericLiteral } from './numericLiteral'

export class Jump {
  condition: boolean | undefined
  consume: boolean
  toPosition: number

  constructor(
    condition: boolean | undefined = undefined,
    consume: boolean = false,
    toPosition: number = 0
  ) {
    this.condition = condition
    this.consume = consume
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
    $PRE_INCREMENT: (lvalue: NumericLiteral, env: Frame) => lvalue.increment(env, true),
    $POST_INCREMENT: (lvalue: NumericLiteral, env: Frame) => lvalue.increment(env, false),
    $PRE_DECREMENT: (lvalue: NumericLiteral, env: Frame) => lvalue.decrement(env, true),
    $POST_DECREMENT: (lvalue: NumericLiteral, env: Frame) => lvalue.decrement(env, false)
  }

  public static readonly ASSIGNMENT_OPERATORS = new Set<string>(['=', '+=', '-=', '*=', '/=', '%='])

  private elements: (
    | string
    | PrimitiveType
    | PointerType
    | NumericLiteral
    | IncrementDecrement
    | FunctionCall
    | Jump
  )[]
  private type: DataType

  static of(numeric: NumericLiteral): Expression {
    return new Expression([numeric], numeric.getDataType())
  }

  constructor(
    elements: (
      | string
      | PrimitiveType
      | PointerType
      | NumericLiteral
      | IncrementDecrement
      | FunctionCall
      | Jump
    )[],
    type: DataType
  ) {
    this.elements = elements
    this.type = type
  }

  getType(): DataType {
    return this.type
  }

  isImmediateString() {
    return this.type.toString() == 'char*' && this.elements.length == 1
  }

  toImmediateString(): string {
    if (!this.isImmediateString()) {
      throw new Error('cannot get immediate string literal')
    }
    return this.elements[0] as string
  }

  private static toNumberLiteral(val: NumericLiteral | undefined, env: Frame): NumericLiteral {
    if (val == undefined) {
      throw new Error('undefined operand')
    } else {
      return val
    }
  }

  evaluate(env: Frame, context: CProgramContext): NumericLiteral | undefined {
    const result: NumericLiteral[] = []
    let i = 0
    while (i < this.elements.length) {
      const ele = this.elements[i]
      if (ele instanceof Jump) {
        const jump = ele as Jump
        if (
          jump.condition == undefined ||
          jump.condition ==
            Expression.toNumberLiteral(
              jump.consume ? result.pop() : result[result.length - 1],
              env
            ).toBoolean()
        ) {
          i = jump.toPosition
          continue
        }
      } else if (ele instanceof FunctionCall) {
        const returnVal = ele.execute(env, context)
        if (ele.getReturnType() != PrimitiveTypes.void) {
          result.push(returnVal as NumericLiteral)
        }
      } else if (ele instanceof NumericLiteral) {
        result.push(ele)
      } else if (ele instanceof DataType) {
        result.push(Expression.toNumberLiteral(result.pop(), env).castToType(ele))
      } else if (ele.startsWith('"')) {
        result.push(env.allocateStringLiteral(ele))
      } else if (ele == '&') {
        result.push(Expression.toNumberLiteral(result.pop(), env).toAddress())
      } else if (ele == DEREFERENCE_TAG) {
        result.push(env.dereference(Expression.toNumberLiteral(result.pop(), env)))
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
      } else if (NumericLiteral.UNARY_ARITHMETIC_OPERATORS.has(ele)) {
        const operator = NumericLiteral.UNARY_ARITHMETIC_OPERATORS.get(ele)
        if (!operator) {
          throw new Error('impossible execution path')
        }
        result.push(operator(Expression.toNumberLiteral(result.pop(), env)))
      } else if (Expression.ASSIGNMENT_OPERATORS.has(ele)) {
        const right = result.pop()
        result.push(
          Expression.toNumberLiteral(result.pop(), env).assign(
            env,
            Expression.toNumberLiteral(right, env),
            ele
          )
        )
      } else if (this.elements[i + 1] == STRUCT_MEMBER_ACCESS_TAG) {
        const fieldName = ele
        const struct = result.pop()
        if (struct == undefined) {
          throw new Error('impossible execution path')
        }
        const structType = struct.getDataType() as StructType
        const fieldMemOffset = structType.getFieldMemOffset(fieldName)
        const fieldType = structType.getFieldType(fieldName) as DataType
        result.push(env.readAddress(struct.getAddress() + fieldMemOffset, fieldType))
        i += 1
      } else {
        result.push(env.lookupNumber(ele))
      }
      i++
    }
    return result.pop()?.castToType(this.type, true)
  }
}
