import { NumericLiteral } from '../entity/expression/numericLiteral'
import { BuiltinFunction, RealBuiltinFunction } from '../entity/function/builtinFunction'
import { Frame } from './frame'

const RAND_MAX = 2147483647
const MAX_INT = 2147483647

export enum PrimitiveType {
  INT = 'int',
  FLOAT = 'float',
  FUNCTION = 'function',
  VOID = 'void',
  CHAR = 'char'
}

export class PointerType {
  private pointingTo: DataType

  constructor(pointingTo: DataType) {
    this.pointingTo = pointingTo
  }

  dereference(): DataType {
    return this.pointingTo
  }

  toString(): string {
    return this.pointingTo.toString() + '*'
  }
}

export type DataType = PrimitiveType | PointerType

export const ARITH_PRIMITIVE_TYPES = new Set<string>([
  PrimitiveType.CHAR,
  PrimitiveType.FLOAT,
  PrimitiveType.INT
])

export const WHOLE_PRIMITIVE_TYPES = new Set<string>([PrimitiveType.CHAR, PrimitiveType.INT])

export function sizeof(type: DataType): number {
  if (type instanceof PointerType) {
    return 4
  } else if (type == PrimitiveType.VOID) {
    return 1
  } else if (type == PrimitiveType.INT || type == PrimitiveType.FLOAT) {
    return 4
  } else if (type == PrimitiveType.FUNCTION) {
    return 0
  } else if (type == PrimitiveType.CHAR) {
    return 1
  } else {
    throw new Error('unsupported sizeof datatype: ' + type)
  }
}

export const PRIMITIVE_TYPES = Object.values(PrimitiveType)

const rand: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(NumericLiteral.new(Math.floor(Math.random() * MAX_INT)).castToType(PrimitiveType.INT))
}

const time: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(NumericLiteral.new(Math.floor(Date.now() / 1000)).castToType(PrimitiveType.INT))
}

export const PLACEHOLDER_REGEX = /%d|%ld|%f|%lf|%s|%c|%p/

const printf: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  let outputString = env.dereferenceAsString(args[0])
  let i = 1
  while (i < args.length) {
    const toReplace = PLACEHOLDER_REGEX.exec(outputString)
    if (toReplace == null) {
      throw new Error('data unused in format string')
    } else if (toReplace[0] == '%s') {
      outputString = outputString.replace(PLACEHOLDER_REGEX, env.dereferenceAsString(args[i]))
    } else if (toReplace[0] == '%c') {
      outputString = outputString.replace(PLACEHOLDER_REGEX, args[i].toChar())
    } else {
      outputString = outputString.replace(PLACEHOLDER_REGEX, String(args[i].getValue()))
    }
    i++
  }
  if (PLACEHOLDER_REGEX.test(outputString)) {
    throw new Error("expected more data arguments, '" + outputString + "'")
  }
  context['stdout'] += outputString
  rts.push(NumericLiteral.new(outputString.length).castToType(PrimitiveType.INT))
}

const scanf: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  let i = 1
  let formatString = env.dereferenceAsString(args[0])
  while (i < args.length) {
    const input = prompt(context['stdout'])
    if (input == null) {
      throw Error('execution interrupted')
    }
    const tokens = input?.split(/\s+/)
    for (let j = 0; tokens && j < tokens.length; j++) {
      const match = PLACEHOLDER_REGEX.exec(formatString)
      if (match == null) {
        throw new Error('impossible execution path')
      }
      formatString = formatString.replace(PLACEHOLDER_REGEX, '0')
      const numeric = isNaN(parseFloat(tokens[j]))
        ? NumericLiteral.new(0)
        : NumericLiteral.new(parseFloat(tokens[j]))
      if (isNaN(parseFloat(tokens[j]))) {
        env.assignValueByAddress(args[i].getValue(), NumericLiteral.new(0))
      }
      if (match[0] == '%c') {
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveType.CHAR))
      } else if (match[0] == '%d' || match[0] == '%ld') {
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveType.INT))
      } else if (match[0] == '%f' || match[0] == '%lf') {
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveType.FLOAT))
      } else {
        throw new Error('unsupported datatype for scanf: ' + match[0])
      }
      i++
    }
    context['stdout'] += input + '\n'
  }
  rts.push(NumericLiteral.new(i - 1).castToType(PrimitiveType.INT))
}

const sqrt: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(args[0].sqrt())
}

const abs: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(args[0].abs())
}

const strlen: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(NumericLiteral.new(env.dereferenceAsString(args[0]).length).castToType(PrimitiveType.INT))
}

const malloc: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  rts.push(env.allocateOnHeap(args[0]))
}

const free: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: NumericLiteral[]
): void => {
  env.free(args[0])
}

export const BUILTINS = {
  printf: [
    new BuiltinFunction(
      PrimitiveType.INT,
      'printf',
      [new PointerType(PrimitiveType.CHAR)],
      printf,
      false,
      true
    ),
    PrimitiveType.FUNCTION
  ],
  scanf: [
    new BuiltinFunction(
      PrimitiveType.INT,
      'scanf',
      [new PointerType(PrimitiveType.CHAR)],
      scanf,
      true,
      true
    ),
    PrimitiveType.FUNCTION
  ],
  rand: [new BuiltinFunction(PrimitiveType.INT, 'rand', [], rand), PrimitiveType.FUNCTION],
  time: [new BuiltinFunction(PrimitiveType.INT, 'time', [], time), PrimitiveType.FUNCTION],
  sqrt: [
    new BuiltinFunction(PrimitiveType.FLOAT, 'sqrt', [PrimitiveType.FLOAT], sqrt),
    PrimitiveType.FUNCTION
  ],
  abs: [
    new BuiltinFunction(PrimitiveType.INT, 'abs', [PrimitiveType.INT], abs),
    PrimitiveType.FUNCTION
  ],
  strlen: [
    new BuiltinFunction(PrimitiveType.INT, 'strlen', [new PointerType(PrimitiveType.CHAR)], strlen),
    PrimitiveType.FUNCTION
  ],
  malloc: [
    new BuiltinFunction(new PointerType(PrimitiveType.VOID), 'malloc', [PrimitiveType.INT], malloc),
    PrimitiveType.FUNCTION
  ],
  free: [
    new BuiltinFunction(PrimitiveType.VOID, 'free', [new PointerType(PrimitiveType.VOID)], free),
    PrimitiveType.FUNCTION
  ]
  //   RAND_MAX: [new NumericLiteral(RAND_MAX, PrimitiveType.INT), PrimitiveType.INT],
  //   MAX_INT: [new NumericLiteral(MAX_INT, PrimitiveType.INT), PrimitiveType.INT]
}
