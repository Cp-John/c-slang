import { NumericLiteral } from '../entity/expression/numericLiteral'
import { BuiltinFunction, RealBuiltinFunction } from '../entity/function/builtinFunction'
import { Function } from '../entity/function/function'
import { SelfDefinedFunction } from '../entity/function/selfDefinedFunction'
import { Lexer } from '../parser/lexer'

const RAND_MAX = 2147483647
const MAX_INT = 2147483647

export enum DataType {
  INT = 'int',
  FLOAT = 'float',
  FUNCTION = 'function',
  VOID = 'void',
  STRING = 'char*'
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
  while (i < args.length) {
    const input = prompt(context['stdout'])
    if (input == null) {
      throw Error('execution interrupted')
    }
    const tokens = input?.split(/\s+/)
    for (let j = 0; tokens && j < tokens.length; j++) {
      const variableName = (args[i] as string).replaceAll('"', '')
      const variableType = env.lookupType(variableName)
      if (isNaN(parseFloat(tokens[j]))) {
        env.assignValue(variableName, new NumericLiteral(0, variableType))
      } else {
        env.assignValue(variableName, new NumericLiteral(parseFloat(tokens[j]), variableType))
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

const BUILTINS = {
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
  sqrt: [new BuiltinFunction(DataType.FLOAT, 'sqrt', [DataType.FLOAT], sqrt), DataType.FUNCTION],
  RAND_MAX: [new NumericLiteral(RAND_MAX, DataType.INT), DataType.INT],
  MAX_INT: [new NumericLiteral(MAX_INT, DataType.INT), DataType.INT]
}

export class Frame {
  private boundings
  private prev: Frame | null

  private static addBuiltins(frame: Frame): Frame {
    for (const name in BUILTINS) {
      frame.declare(name, BUILTINS[name][1])
      frame.assignValue(name, BUILTINS[name][0])
    }
    return frame
  }

  static getBuiltinFrame(): Frame {
    return Frame.addBuiltins(new Frame(null))
  }

  private constructor(prev: Frame | null) {
    this.boundings = {}
    this.prev = prev
  }

  private getFrameWithName(name: string): Frame | null {
    if (name in this.boundings) {
      return this
    }
    let currentFrame = this.prev
    while (currentFrame != null && !(name in currentFrame.boundings)) {
      currentFrame = currentFrame.prev
    }
    return currentFrame
  }

  private findFrameWith(name: string): Frame {
    const frame = this.getFrameWithName(name)
    if (frame == null) {
      throw new Error('undeclared symbol: ' + name)
    }
    return frame
  }

  isDeclared(name: string): boolean {
    return this.getFrameWithName(name) != null
  }

  isFunctionDefined(functionName: string): boolean {
    const frame = this.getFrameWithName(functionName)
    if (frame == null) {
      return false
    }
    const obj = frame.boundings[functionName]
    return obj['val'] instanceof Function && obj['val'].isDefined()
  }

  lookupNumber(name: string): NumericLiteral {
    const result = this.lookup(name)
    if (!(result instanceof NumericLiteral)) {
      throw new Error('unmatched variable type, expected number, got function object')
    }
    return result
  }

  lookupFunction(name: string): Function {
    const result = this.lookup(name)
    if (!(result instanceof Function)) {
      throw new Error('unmatched variable type, expected function object, got number')
    }
    return result
  }

  private lookup(name: string): Function | NumericLiteral {
    const frame = this.findFrameWith(name)
    if (frame.boundings[name]['val'] == undefined) {
      throw new Error('unbounded identifier: ' + name)
    }
    return frame.boundings[name]['val']
  }

  markType(name: string, type: DataType) {
    this.findFrameWith(name).boundings[name]['type'] = type
  }

  lookupType(name: string): DataType {
    return this.findFrameWith(name).boundings[name]['type']
  }

  private isRedefinition(name: string): boolean {
    return (
      name in this.boundings &&
      (!(this.boundings[name]['val'] instanceof SelfDefinedFunction) ||
        this.boundings[name]['val'].isDefined())
    )
  }

  declare(nameOrLexer: string | Lexer, type: DataType): string {
    let name: string
    if (nameOrLexer instanceof Lexer) {
      nameOrLexer.hasNext()
      const [row, col] = nameOrLexer.tell()
      name = nameOrLexer.eatIdentifier()
      if (this.isRedefinition(name)) {
        throw new Error(nameOrLexer.formatError("redefinition of '" + name + "'", row, col))
      }
    } else {
      name = nameOrLexer
      if (this.isRedefinition(name)) {
        throw new Error("redefinition of '" + name + "'")
      }
    }
    this.boundings[name] = { type: type, val: undefined }
    return name
  }

  assignValue<Type extends NumericLiteral | Function>(name: string, val: Type): Type {
    this.findFrameWith(name).boundings[name]['val'] = val
    if (this.lookupType(name) == DataType.INT) {
      ;(val as NumericLiteral).truncateDecimals()
    }
    return val
  }

  static extend(prev: Frame) {
    return new Frame(prev)
  }
}
