import { BuiltinFunction } from '../entity/function/builtinFunction'

function printf(env: Frame, rts: Frame[], context: any, args: (string | number)[]) {
  let outputString = args[0] as string
  outputString = outputString.replaceAll('"', '')
  outputString = outputString.replaceAll('\\n', '\n')
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
  alert(context['stdout'])
}

function scanf(env: Frame, rts: Frame[], context: any, args: string[]) {
  let i = 1
  while (i < args.length) {
    const input = prompt()
    const tokens = input?.split(/\s+/)
    for (let j = 0; tokens && j < tokens.length; j++) {
      const variableName = args[i].replaceAll('"', '')
      env.assignValue(variableName, parseFloat(tokens[j]))
      i++
    }
    context['stdout'] += input + '\n'
  }
}

const BUILTINS = {
  printf: new BuiltinFunction('void', 'printf', printf),
  scanf: new BuiltinFunction('int', 'scanf', scanf)
}

export class Frame {
  private boundings
  private prev: Frame | null

  private static addBuiltins(frame: Frame): Frame {
    for (const name in BUILTINS) {
      frame.declare(name)
      frame.assignValue(name, BUILTINS[name])
    }
    return frame
  }

  static createNewFrame(): Frame {
    return Frame.addBuiltins(new Frame(null))
  }

  private constructor(prev: Frame | null) {
    this.boundings = {}
    this.prev = prev
  }

  private findFrameWith(name: string): Frame {
    if (name in this.boundings) {
      return this
    }
    let currentFrame = this.prev
    while (currentFrame != null && !(name in currentFrame.boundings)) {
      currentFrame = currentFrame.prev
    }
    if (currentFrame == null) {
      throw new Error('undeclared symbol: ' + name)
    }
    return currentFrame
  }

  lookup(name: string) {
    const frame = this.findFrameWith(name)
    if (frame.boundings[name] == undefined) {
      throw new Error('unbounded identifier: ' + name)
    }
    return frame.boundings[name]
  }

  declare(name: string) {
    if (name in this.boundings) {
      throw new Error('redefinition of ' + name)
    }
    this.boundings[name] = undefined
  }

  assignValue(name: string, val: any): any {
    this.findFrameWith(name).boundings[name] = val
    return val
  }

  static extend(prev: Frame) {
    return new Frame(prev)
  }
}
