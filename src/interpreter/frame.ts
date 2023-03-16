import { NumericLiteral } from '../entity/expression/numericLiteral'
import { Function } from '../entity/function/function'
import { SelfDefinedFunction } from '../entity/function/selfDefinedFunction'
import { Lexer } from '../parser/lexer'
import { BUILTINS, DataType } from './builtins'

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
