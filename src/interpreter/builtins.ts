import { PointerType } from '../entity/datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../entity/datatype/primitiveType'
import { NumericLiteral } from '../entity/expression/numericLiteral'
import { BuiltinFunction, RealBuiltinFunction } from '../entity/function/builtinFunction'
import { Lexer } from '../parser/lexer'
import { CProgramContext } from './cProgramContext'
import { Frame } from './frame'

export const RAND_MAX = 2147483647
export const INT_MAX = 2147483647
export const INT_MIN = -2147483648

export const CHAR_MAX = 127
export const CHAR_MIN = -128

export const UINT_MAX = 4294967295

export const PRIMITIVE_TYPES = Object.values(PrimitiveType)

const rand: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return NumericLiteral.new(Math.floor(Math.random() * INT_MAX)).castToType(PrimitiveTypes.int)
}

const time: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return NumericLiteral.new(Math.floor(Date.now() / 1000)).castToType(PrimitiveTypes.int)
}

export const PLACEHOLDER_REGEX = /%d|%ld|%f|%lf|%s|%c|%p/

const printf: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
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
  context.stdout += outputString
  return NumericLiteral.new(outputString.length).castToType(PrimitiveTypes.int)
}

const scanf: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  let i = 1
  let formatString = env.dereferenceAsString(args[0])

  while (i < args.length) {
    const input = prompt(context.stdout)
    if (input == null) {
      throw Error('execution interrupted')
    }
    context.stdout += input + '\n'
    const tokens = input?.split(/\s+/)
    for (let j = 0; i < args.length && tokens && j < tokens.length; j++) {
      const match = PLACEHOLDER_REGEX.exec(formatString)
      if (match == null) {
        throw new Error('impossible execution path')
      }
      formatString = formatString.replace(PLACEHOLDER_REGEX, '0')
      if (match[0] == '%s') {
        for (let k = 0; k < tokens[j].length; k++) {
          const ch = tokens[j][k]
          if (!Lexer.isAsciiChar(ch)) {
            throw new Error("expected ascii character, but got '" + ch + "'")
          }
          env.assignValueByAddress(
            args[i].getValue() + k,
            NumericLiteral.new(ch.charCodeAt(0)).castToType(PrimitiveTypes.char)
          )
        }
        env.assignValueByAddress(
          args[i].getValue() + tokens[j].length,
          NumericLiteral.new(0).castToType(PrimitiveTypes.char)
        )
      } else {
        const numeric = isNaN(parseFloat(tokens[j]))
          ? NumericLiteral.new(0)
          : NumericLiteral.new(parseFloat(tokens[j]))
        if (isNaN(parseFloat(tokens[j]))) {
          env.assignValueByAddress(args[i].getValue(), NumericLiteral.new(0))
        }
        if (match[0] == '%c') {
          env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.char))
        } else if (match[0] == '%d' || match[0] == '%ld') {
          env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.int))
        } else if (match[0] == '%f' || match[0] == '%lf') {
          env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.float))
        } else {
          throw new Error('unsupported datatype for scanf: ' + match[0])
        }
      }
      i++
    }
  }
  // reset context
  context.startTimeMs = new Date().getTime()
  context.executedStatementCount = 0
  return NumericLiteral.new(i - 1).castToType(PrimitiveTypes.int)
}

const sqrt: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return args[0].sqrt()
}

const abs: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return args[0].abs()
}

const strlen: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return NumericLiteral.new(env.dereferenceAsString(args[0]).length).castToType(PrimitiveTypes.int)
}

const strncpy: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  env.copyNString(args[0], args[1], args[2].getValue())
}

const strcpy: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  env.copyString(args[0], args[1])
}

const strcmp: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return NumericLiteral.new(
    env.dereferenceAsString(args[0]).localeCompare(env.dereferenceAsString(args[1]))
  ).castToType(PrimitiveTypes.int)
}

const malloc: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return env.allocateOnHeap(args[0])
}

const free: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  env.free(args[0])
}

const printHeap: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  env.printHeap(context)
}

const printEnv: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  env.printEnv(context)
}

const exit: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): void => {
  const status = args[0].getValue()
  const msg =
    'program terminated ' +
    (status == 0 ? 'successfully' : 'unsuccessfully') +
    ' with status ' +
    String(status)
  if (status == 0) {
    throw msg
  } else {
    throw new Error(msg)
  }
}

export const BUILTIN_FUNCTIONS = {
  printf: new BuiltinFunction(
    PrimitiveTypes.int,
    'printf',
    [new PointerType(PrimitiveTypes.char)],
    printf,
    false,
    true
  ),
  scanf: new BuiltinFunction(
    PrimitiveTypes.int,
    'scanf',
    [new PointerType(PrimitiveTypes.char)],
    scanf,
    true,
    true
  ),
  rand: new BuiltinFunction(PrimitiveTypes.int, 'rand', [], rand),
  time: new BuiltinFunction(PrimitiveTypes.int, 'time', [], time),
  sqrt: new BuiltinFunction(PrimitiveTypes.float, 'sqrt', [PrimitiveTypes.float], sqrt),

  abs: new BuiltinFunction(PrimitiveTypes.int, 'abs', [PrimitiveTypes.int], abs),

  strlen: new BuiltinFunction(
    PrimitiveTypes.int,
    'strlen',
    [new PointerType(PrimitiveTypes.char)],
    strlen
  ),

  strncpy: new BuiltinFunction(
    PrimitiveTypes.void,
    'strncpy',
    [
      new PointerType(PrimitiveTypes.char),
      new PointerType(PrimitiveTypes.char),
      PrimitiveTypes.int
    ],
    strncpy
  ),

  strcpy: new BuiltinFunction(
    PrimitiveTypes.void,
    'strcpy',
    [new PointerType(PrimitiveTypes.char), new PointerType(PrimitiveTypes.char)],
    strcpy
  ),

  strcmp: new BuiltinFunction(
    PrimitiveTypes.int,
    'strcmp',
    [new PointerType(PrimitiveTypes.char), new PointerType(PrimitiveTypes.char)],
    strcmp
  ),

  malloc: new BuiltinFunction(
    new PointerType(PrimitiveTypes.void),
    'malloc',
    [PrimitiveTypes.int],
    malloc
  ),

  free: new BuiltinFunction(
    PrimitiveTypes.void,
    'free',
    [new PointerType(PrimitiveTypes.void)],
    free
  ),

  exit: new BuiltinFunction(PrimitiveTypes.void, 'exit', [PrimitiveTypes.int], exit),

  printHeap: new BuiltinFunction(PrimitiveTypes.void, 'printHeap', [], printHeap),

  printEnv: new BuiltinFunction(PrimitiveTypes.void, 'printEnv', [], printEnv)
  //   RAND_MAX: [new NumericLiteral(RAND_MAX, PrimitiveTypes.int), PrimitiveTypes.int],
  //   INT_MAX: [new NumericLiteral(INT_MAX, PrimitiveTypes.int), PrimitiveTypes.int]
}
