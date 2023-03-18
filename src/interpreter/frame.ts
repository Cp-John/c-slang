import { NumericLiteral } from '../entity/expression/numericLiteral'
import { Function } from '../entity/function/function'
import { SelfDefinedFunction } from '../entity/function/selfDefinedFunction'
import { Memory } from '../memory/memory'
import { Lexer } from '../parser/lexer'
import { BUILTINS, DataType, PointerType, PrimitiveType, sizeof } from './builtins'

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
    return Frame.addBuiltins(new Frame(null, Memory.getOrAllocate().getHalfAddress()))
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

  private lookup(name: string): Function | NumericLiteral | string {
    const frame = this.findFrameWith(name)
    const val = frame.boundings[name]['val']
    const type = frame.boundings[name]['type']
    if (val == undefined) {
      throw new Error('unbounded identifier: ' + name)
    } else if (type instanceof PointerType) {
      return Memory.getOrAllocate().readPointer(val, type)
    } else if (type == PrimitiveType.FUNCTION) {
      return val
    } else if (type == PrimitiveType.INT) {
      return Memory.getOrAllocate().readInt(val)
    } else if (type == PrimitiveType.FLOAT) {
      return Memory.getOrAllocate().readFloat(val)
    } else if (type == PrimitiveType.CHAR) {
      return Memory.getOrAllocate().readChar(val)
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

  allocateStringLiteral(stringLiteral: string): NumericLiteral {
    const address = this.top
    this.top = Memory.getOrAllocate().writeStringLiteral(this.top, stringLiteral)
    console.log('allocated stringLiteral: ' + stringLiteral + ', ' + this.top)
    return NumericLiteral.new(address).castToType(new PointerType(PrimitiveType.CHAR))
  }

  declare(
    name: string,
    type: DataType,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ): string {
    if (this.isRedefinition(name)) {
      let errMsg = "redefinition of '" + name + "'"
      if (lexer != null) {
        errMsg = lexer.formatError(errMsg, row, col)
      }
      throw new Error(errMsg)
    }
    const value = type == PrimitiveType.FUNCTION ? undefined : this.top
    this.top += type == PrimitiveType.FUNCTION ? 0 : 4
    this.boundings[name] = { type: type, val: value }
    console.log('declared variable: (' + name + ', ' + type + '), ' + this.top)
    return name
  }

  assignValueByAddress(address: number, value: NumericLiteral) {
    Memory.getOrAllocate().writeNumeric(address, value)
  }

  assignValue<Type extends NumericLiteral | Function>(name: string, val: Type): Type {
    const variableType = this.lookupType(name)
    const address = this.findFrameWith(name).boundings[name]['val']
    if (variableType == PrimitiveType.FUNCTION) {
      this.findFrameWith(name).boundings[name]['val'] = val
    } else if (
      variableType instanceof PointerType ||
      variableType == PrimitiveType.INT ||
      variableType == PrimitiveType.FLOAT ||
      variableType == PrimitiveType.CHAR
    ) {
      Memory.getOrAllocate().writeNumeric(address, (val as NumericLiteral).castToType(variableType))
    } else {
      throw new Error("attempt to assign to unknown varialble type '" + variableType + "'")
    }
    return val
  }

  static extend(prev: Frame) {
    return new Frame(prev, prev.top)
  }
}
