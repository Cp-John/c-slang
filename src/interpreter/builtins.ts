import { PointerType } from '../entity/datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../entity/datatype/primitiveType'
import { Expression } from '../entity/expression/expression'
import { ExpressionParser } from '../entity/expression/expressionParser'
import { NumericLiteral } from '../entity/expression/numericLiteral'
import { BuiltinFunction, RealBuiltinFunction } from '../entity/function/builtinFunction'
import { Lexer } from '../parser/lexer'
import { CProgramContext } from './cProgramContext'
import { Frame } from './frame'

const RAND_MAX = 2147483647
export const MAX_INT = 2147483647
export const MIN_INT = -2147483648

export const MAX_CHAR = 127
export const MIN_CHAR = -128

export const MAX_UNSGINED_INT = 4294967295

export class ArrayType {
  private eleType: PointerType | PrimitiveType
  private size: number[]

  constructor(eleType: PointerType | PrimitiveType, size: number[]) {
    if (size.length == 0) {
      throw Error('impossible execution path')
    }
    this.eleType = eleType
    this.size = size
  }

  toPointerType(): PointerType {
    return new PointerType(this.dereference())
  }

  canCastTo(type: DataType): boolean {
    if (type.toString() == new PointerType(PrimitiveTypes.void).toString()) {
      return true
    }
    return (
      type instanceof PointerType &&
      this.size.length == 1 &&
      this.eleType.toString() == type.dereference().toString()
    )
  }

  getEleType(): PointerType | PrimitiveType {
    return this.eleType
  }

  getEleCount(): number {
    let result = 1
    for (let i = 0; i < this.size.length; i++) {
      result *= this.size[i]
    }
    return result
  }

  dereference(): DataType {
    if (this.size.length == 1) {
      return this.eleType
    } else {
      return new ArrayType(this.eleType, this.size.slice(1))
    }
  }

  private parseInitialStringExpressions(lexer: Lexer, expressions: Expression[]): void {
    const stringLiteral = lexer.eatStringLiteral()
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      expressions.push(
        Expression.of(NumericLiteral.new(stringLiteral.charCodeAt(i)).castToType(this.eleType))
      )
    }
    expressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
  }

  private padInitialArrayExpressions(
    currentExpressions: Expression[],
    expressions: Expression[],
    row: number,
    col: number,
    lexer: Lexer
  ) {
    if (currentExpressions.length > this.getEleCount()) {
      throw new Error(
        lexer.formatError('more elements in array initializer than expected', row, col)
      )
    }
    for (let i = currentExpressions.length; i < this.getEleCount(); i++) {
      currentExpressions.push(Expression.of(NumericLiteral.new(0).castToType(this.eleType)))
    }
    currentExpressions.forEach(expr => expressions.push(expr))
  }

  parseInitialArrayExpressions(env: Frame, lexer: Lexer, expressions: Expression[]): void {
    const [row, col] = lexer.tell()
    const currentExpressions: Expression[] = []
    if (lexer.matchDelimiter('"') && this.eleType == PrimitiveTypes.char && this.size.length == 1) {
      this.parseInitialStringExpressions(lexer, currentExpressions)
      this.padInitialArrayExpressions(currentExpressions, expressions, row, col, lexer)
      return
    }

    lexer.eatDelimiter('{')
    if (lexer.matchDelimiter('}')) {
      // pass
    } else if (this.size.length == 1 || !(lexer.matchDelimiter('"') || lexer.matchDelimiter('{'))) {
      currentExpressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType))
      while (!lexer.matchDelimiter('}')) {
        lexer.eatDelimiter(',')
        currentExpressions.push(ExpressionParser.parse(env, lexer, false, false, this.eleType))
      }
    } else {
      ;(this.dereference() as ArrayType).parseInitialArrayExpressions(
        env,
        lexer,
        currentExpressions
      )
    }
    lexer.eatDelimiter('}')
    this.padInitialArrayExpressions(currentExpressions, expressions, row, col, lexer)
  }

  toString(): string {
    let result = this.eleType.toString()
    for (let i = 0; i < this.size.length; i++) {
      result += '[' + String(this.size[i]) + ']'
    }
    return result
  }

  getSize(): number {
    return this.getEleCount() * sizeof(this.eleType)
  }
}

export type DataType = PrimitiveType | PointerType | ArrayType

export const ARITH_PRIMITIVE_TYPES = new Set<string>([
  PrimitiveTypes.char.toString(),
  PrimitiveTypes.float.toString(),
  PrimitiveTypes.int.toString()
])

export const WHOLE_PRIMITIVE_TYPES = new Set<string>([PrimitiveTypes.char.toString(), PrimitiveTypes.int.toString()])

export function sizeof(type: DataType): number {
  if (type instanceof ArrayType) {
    return type.getSize()
  } else if (type instanceof PointerType) {
    return 4
  } else if (type == PrimitiveTypes.void) {
    return 1
  } else if (type == PrimitiveTypes.int || type == PrimitiveTypes.float) {
    return 4
  } else if (type == PrimitiveTypes.function) {
    return 0
  } else if (type == PrimitiveTypes.char) {
    return 1
  } else {
    throw new Error('unsupported sizeof datatype: ' + type)
  }
}

export const PRIMITIVE_TYPES = Object.values(PrimitiveType)

const rand: RealBuiltinFunction = (
  env: Frame,
  context: CProgramContext,
  args: NumericLiteral[]
): NumericLiteral => {
  return NumericLiteral.new(Math.floor(Math.random() * MAX_INT)).castToType(PrimitiveTypes.int)
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
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.char))
      } else if (match[0] == '%d' || match[0] == '%ld') {
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.int))
      } else if (match[0] == '%f' || match[0] == '%lf') {
        env.assignValueByAddress(args[i].getValue(), numeric.castToType(PrimitiveTypes.float))
      } else {
        throw new Error('unsupported datatype for scanf: ' + match[0])
      }
      i++
    }
    context.stdout += input + '\n'
  }
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

export const BUILTINS = {}

// export const BUILTINS = {
//   printf: [
//     new BuiltinFunction(
//       PrimitiveTypes.int,
//       'printf',
//       [new PointerType(PrimitiveTypes.char)],
//       printf,
//       false,
//       true
//     ),
//     PrimitiveTypes.function
//   ],
//   scanf: [
//     new BuiltinFunction(
//       PrimitiveTypes.int,
//       'scanf',
//       [new PointerType(PrimitiveTypes.char)],
//       scanf,
//       true,
//       true
//     ),
//     PrimitiveTypes.function
//   ],
//   rand: [new BuiltinFunction(PrimitiveTypes.int, 'rand', [], rand), PrimitiveTypes.function],
//   time: [new BuiltinFunction(PrimitiveTypes.int, 'time', [], time), PrimitiveTypes.function],
//   sqrt: [
//     new BuiltinFunction(PrimitiveTypes.float, 'sqrt', [PrimitiveTypes.float], sqrt),
//     PrimitiveTypes.function
//   ],
//   abs: [
//     new BuiltinFunction(PrimitiveTypes.int, 'abs', [PrimitiveTypes.int], abs),
//     PrimitiveTypes.function
//   ],
//   strlen: [
//     new BuiltinFunction(PrimitiveTypes.int, 'strlen', [new PointerType(PrimitiveTypes.char)], strlen),
//     PrimitiveTypes.function
//   ],
//   malloc: [
//     new BuiltinFunction(new PointerType(PrimitiveTypes.void), 'malloc', [PrimitiveTypes.int], malloc),
//     PrimitiveTypes.function
//   ],
//   free: [
//     new BuiltinFunction(PrimitiveTypes.void, 'free', [new PointerType(PrimitiveTypes.void)], free),
//     PrimitiveTypes.function
//   ],
//   printHeap: [
//     new BuiltinFunction(PrimitiveTypes.void, 'printHeap', [], printHeap),
//     PrimitiveTypes.function
//   ],
//   printEnv: [
//     new BuiltinFunction(PrimitiveTypes.void, 'printEnv', [], printEnv),
//     PrimitiveTypes.function
//   ]
//   //   RAND_MAX: [new NumericLiteral(RAND_MAX, PrimitiveTypes.int), PrimitiveTypes.int],
//   //   MAX_INT: [new NumericLiteral(MAX_INT, PrimitiveTypes.int), PrimitiveTypes.int]
// }
