import { NumericLiteral } from '../entity/expression/numericLiteral'
import { BuiltinFunction, RealBuiltinFunction } from '../entity/function/builtinFunction'
import { Memory } from '../memory/memory'
import { Frame } from './frame'

const RAND_MAX = 2147483647
const MAX_INT = 2147483647

export enum DataType {
  INT = 'int',
  FLOAT = 'float',
  FUNCTION = 'function',
  VOID = 'void',
  STRING = 'char*'
}

function sizeof(type: DataType): number {
  if (type == DataType.INT || type == DataType.FLOAT) {
    return 4
  } else if (type == DataType.STRING) {
    return 8
  } else if (type == DataType.FUNCTION) {
    return 0
  } else {
    throw new Error('unsupported sizeof datatype: ' + type)
  }
}

export const DATA_TYPES = Object.values(DataType)

const rand: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: (string | NumericLiteral)[]
): void => {
  rts.push(new NumericLiteral(Math.floor(Math.random() * MAX_INT), DataType.INT))
}

const time: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: (string | NumericLiteral)[]
): void => {
  rts.push(new NumericLiteral(Math.floor(Date.now() / 1000), DataType.INT))
}

export const PLACEHOLDER_REGEX = /%d|%ld|%f|%lf|%s|%c/

const printf: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: (string | NumericLiteral)[]
): void => {
  let outputString = args[0] as string
  outputString = outputString.substring(1, outputString.length - 1)
  let i = 1
  while (i < args.length) {
    const toReplace = PLACEHOLDER_REGEX.exec(outputString)
    if (toReplace == null) {
      throw new Error('data unused in format string')
    } else if (toReplace[0] == '%s') {
      const str = args[i] as string
      outputString = outputString.replace(PLACEHOLDER_REGEX, str.substring(1, str.length - 1))
    } else if (toReplace[0] == '%c') {
      outputString = outputString.replace(
        PLACEHOLDER_REGEX,
        String.fromCharCode((args[i] as NumericLiteral).getValue())
      )
    } else {
      outputString = outputString.replace(
        PLACEHOLDER_REGEX,
        String((args[i] as NumericLiteral).getValue())
      )
    }
    i++
  }
  if (PLACEHOLDER_REGEX.test(outputString)) {
    throw new Error('expected more data arguments')
  }
  context['stdout'] += outputString
  rts.push(new NumericLiteral(outputString.length, DataType.INT))
}

const scanf: RealBuiltinFunction = (
  env: Frame,
  rts: any[],
  context: any,
  args: (string | NumericLiteral)[]
): void => {
  let i = 1
  let formatString = args[0] as string
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
        Memory.getOrAllocate().writeNumeric(
          (args[i] as NumericLiteral).getValue(),
          NumericLiteral.new(0)
        )
      }
      if (match[0] == '%c' || match[0] == '%d' || match[0] == '%ld') {
        Memory.getOrAllocate().writeNumeric(
          (args[i] as NumericLiteral).getValue(),
          numeric.castToType(DataType.INT)
        )
      } else if (match[0] == '%f' || match[0] == '%lf') {
        Memory.getOrAllocate().writeNumeric(
          (args[i] as NumericLiteral).getValue(),
          numeric.castToType(DataType.FLOAT)
        )
      } else {
        throw new Error('unsupported datatype for scanf: ' + match[0])
      }
      i++
    }
    context['stdout'] += input + '\n'
  }
  rts.push(new NumericLiteral(i - 1, DataType.INT))
}

const sqrt: RealBuiltinFunction = (env: Frame, rts: any[], context: any, args: string[]): void => {
  rts.push(new NumericLiteral(Math.sqrt(parseFloat(args[0])), DataType.FLOAT))
}

export const BUILTINS = {
  printf: [
    new BuiltinFunction(DataType.INT, 'printf', [DataType.STRING], printf, true),
    DataType.FUNCTION
  ],
  scanf: [
    new BuiltinFunction(DataType.INT, 'scanf', [DataType.STRING], scanf, true),
    DataType.FUNCTION
  ],
  rand: [new BuiltinFunction(DataType.INT, 'rand', [], rand), DataType.FUNCTION],
  time: [new BuiltinFunction(DataType.INT, 'time', [], time), DataType.FUNCTION],
  sqrt: [new BuiltinFunction(DataType.FLOAT, 'sqrt', [DataType.FLOAT], sqrt), DataType.FUNCTION]
  //   RAND_MAX: [new NumericLiteral(RAND_MAX, DataType.INT), DataType.INT],
  //   MAX_INT: [new NumericLiteral(MAX_INT, DataType.INT), DataType.INT]
}
