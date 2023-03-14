import { BuiltinFunction } from '../entity/function/builtinFunction'
import { Lexer } from '../parser/lexer'

const MAX_INT = 2147483647

export enum VariableType {
  NUMBER,
  FUNCTION
}

function rand(env: Frame, rts: any[], context: any, args: (string | number)[]): number {
  return Math.floor(Math.random() * MAX_INT)
}

function time(env: Frame, rts: any[], context: any, args: (string | number)[]): number {
  return Math.floor(Date.now() / 1000)
}

function printf(env: Frame, rts: any[], context: any, args: (string | number)[]) {
  let outputString = args[0] as string
  outputString = outputString.substring(1, outputString.length - 1)
  const regex = /%d|%f|%lf/
  for (let i = 1; i < args.length; i++) {
    if (!regex.test(outputString)) {
      throw new Error('data unused in format string')
    }
    outputString = outputString.replace(regex, String(args[i]))
  }
  if (regex.test(outputString)) {
    throw new Error('expected more data arguments')
  }
  context['stdout'] += outputString
}

function scanf(env: Frame, rts: any[], context: any, args: string[]) {
  let i = 1
  while (i < args.length) {
    const input = prompt(context['stdout'])
    if (input == null) {
      throw Error('execution interrupted')
    }
    const tokens = input?.split(/\s+/)
    for (let j = 0; tokens && j < tokens.length; j++) {
      const variableName = args[i].replaceAll('"', '')
      if (isNaN(parseFloat(tokens[j]))) {
        env.assignValue(variableName, 0)
      } else {
        env.assignValue(variableName, parseFloat(tokens[j]))
      }
      i++
    }
    context['stdout'] += input + '\n'
  }
}

const BUILTINS = {
  printf: new BuiltinFunction('void', 'printf', printf),
  scanf: new BuiltinFunction('int', 'scanf', scanf),
  rand: new BuiltinFunction('int', 'rand', rand, 0),
  time: new BuiltinFunction('int', 'time', time, 0)
}

export class Frame {
  private boundings
  private prev: Frame | null

  private static addBuiltins(frame: Frame): Frame {
    for (const name in BUILTINS) {
      frame.declare(name, VariableType.FUNCTION)
      frame.assignValue(name, BUILTINS[name])
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

  lookup(name: string) {
    const frame = this.findFrameWith(name)
    if (frame.boundings[name]['val'] == undefined) {
      throw new Error('unbounded identifier: ' + name)
    }
    return frame.boundings[name]['val']
  }

  markType(name: string, type: VariableType) {
    this.findFrameWith(name).boundings[name]['type'] = type
  }

  lookupType(name: string): VariableType {
    return this.findFrameWith(name).boundings[name]['type']
  }

  declare(nameOrLexer: string | Lexer, type: VariableType): string {
    let name: string
    if (nameOrLexer instanceof Lexer) {
      nameOrLexer.hasNext()
      const [row, col] = nameOrLexer.tell()
      name = nameOrLexer.eatIdentifier()
      if (name in this.boundings) {
        throw new Error(nameOrLexer.formatError("redefinition of '" + name + "'", row, col))
      }
    } else {
      name = nameOrLexer
      if (name in this.boundings) {
        throw new Error("redefinition of '" + name + "'")
      }
    }
    this.boundings[name] = { type: type, val: undefined }
    return name
  }

  assignValue(name: string, val: any): any {
    this.findFrameWith(name).boundings[name]['val'] = val
    return val
  }

  static extend(prev: Frame) {
    return new Frame(prev)
  }
}
