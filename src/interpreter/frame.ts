import { NumericLiteral } from '../entity/expression/numericLiteral'
import { Function } from '../entity/function/function'
import { SelfDefinedFunction } from '../entity/function/selfDefinedFunction'
import { Memory } from '../memory/memory'
import { Lexer } from '../parser/lexer'
import { BUILTINS, DataType } from './builtins'

export class Frame {
  private boundings
  private prev: Frame | null
  private top: number

  private static addBuiltins(frame: Frame): Frame {
    for (const name in BUILTINS) {
      frame.declare(name, BUILTINS[name][1])
      frame.assignValue(name, BUILTINS[name][0])
    }
    return frame
  }

  static getBuiltinFrame(): Frame {
    return Frame.addBuiltins(new Frame(null, Math.ceil(Memory.getOrAllocate().getNumWords() / 2)))
  }

  private constructor(prev: Frame | null, top: number) {
    this.boundings = {}
    this.prev = prev
    this.top = top
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

  lookupAddress(name: string): NumericLiteral {
    return NumericLiteral.new(this.findFrameWith(name).boundings[name]['val'])
  }

  private lookup(name: string): Function | NumericLiteral | string {
    const frame = this.findFrameWith(name)
    const val = frame.boundings[name]['val']
    const type = frame.boundings[name]['type']
    if (val == undefined) {
      throw new Error('unbounded identifier: ' + name)
    } else if (type == DataType.FUNCTION) {
      return val
    } else if (type == DataType.INT) {
      return Memory.getOrAllocate().readInt(val)
    } else if (type == DataType.FLOAT) {
      return Memory.getOrAllocate().readFloat(val)
    } else if (type == DataType.STRING) {
      return Memory.getOrAllocate().readStringLiteral(val)
    } else {
      throw new Error('lookup unknown datatype: ' + type)
    }
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
    const value = type == DataType.FUNCTION ? undefined : this.top++
    this.boundings[name] = { type: type, val: value }
    return name
  }

  assignValue<Type extends NumericLiteral | Function | string>(name: string, val: Type): Type {
    const variableType = this.lookupType(name)
    const address = this.findFrameWith(name).boundings[name]['val']
    if (variableType == DataType.INT) {
      Memory.getOrAllocate().writeNumeric(address, (val as NumericLiteral).truncateDecimals())
    } else if (variableType == DataType.FLOAT) {
      Memory.getOrAllocate().writeNumeric(address, val as NumericLiteral)
    } else if (variableType == DataType.STRING) {
      Memory.getOrAllocate().writeStringLiteral(address, val as string)
    } else {
      this.findFrameWith(name).boundings[name]['val'] = val
    }
    return val
  }

  static extend(prev: Frame) {
    return new Frame(prev, prev.top)
  }
}
