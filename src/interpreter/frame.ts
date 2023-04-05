import { ArrayType } from '../entity/datatype/arrayType'
import { DataType } from '../entity/datatype/dataType'
import { PointerType } from '../entity/datatype/pointerType'
import { PrimitiveTypes } from '../entity/datatype/primitiveType'
import { StructType } from '../entity/datatype/structType'
import { NumericLiteral } from '../entity/expression/numericLiteral'
import { Function } from '../entity/function/function'
import { SelfDefinedFunction } from '../entity/function/selfDefinedFunction'
import { Memory } from '../memory/memory'
import { Lexer } from '../parser/lexer'
import { BUILTIN_FUNCTIONS } from './builtins'
import { CProgramContext } from './cProgramContext'

export class Frame {
  private depth: number
  private boundings
  private prev: Frame | null
  private stackTop: number
  private memory: Memory

  private static addBuiltins(frame: Frame): Frame {
    for (const name in BUILTIN_FUNCTIONS) {
      frame.declareFunction(name, BUILTIN_FUNCTIONS[name])
    }
    return frame
  }

  static getBuiltinFrame(): Frame {
    const memory = new Memory()
    return Frame.addBuiltins(new Frame(null, memory.getStackBottom(), memory, 0))
  }

  private constructor(prev: Frame | null, stackTop: number, memory: Memory, depth: number) {
    this.boundings = {}
    this.prev = prev
    this.stackTop = stackTop
    this.memory = memory
    this.depth = depth
  }

  getStackTop(): number {
    return this.stackTop
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

  lookupStructMember(name: string, fieldName: string): NumericLiteral {
    const type = this.lookupType(name)
    if (!(type instanceof StructType)) {
      throw new Error("unmatched variable type, expected 'struct', got '" + type + "'")
    }
    const result = this.lookup(name)
    if (!(result instanceof NumericLiteral)) {
      throw new Error('unmatched variable type, expected number, got function object')
    }
    return NumericLiteral.new(result.getAddress() + type.getFieldMemOffset(fieldName)).castToType(
      type.getFieldType(fieldName) as DataType
    )
  }

  readAddress(addr: number, type: DataType) {
    if (type instanceof PointerType) {
      return this.memory.readPointer(addr, type)
    } else if (type == PrimitiveTypes.int) {
      return this.memory.readInt(addr)
    } else if (type == PrimitiveTypes.float) {
      return this.memory.readFloat(addr)
    } else if (type == PrimitiveTypes.char) {
      return this.memory.readChar(addr)
    } else if (type instanceof ArrayType) {
      return NumericLiteral.new(addr, addr).castToType(type, true)
    } else if (type instanceof StructType) {
      return NumericLiteral.new(addr, addr).castToType(type, true)
    } else {
      throw new Error('read unknown datatype: ' + type)
    }
  }

  private lookup(name: string): Function | NumericLiteral | string {
    const frame = this.findFrameWith(name)
    const val = frame.boundings[name]['val']
    const type = frame.boundings[name]['type']
    if (val == undefined) {
      throw new Error('unbounded identifier: ' + name)
    } else if (type == PrimitiveTypes.function) {
      return val
    } else {
      return this.readAddress(val, type)
    }
  }

  lookupType(name: string): DataType {
    return this.findFrameWith(name).boundings[name]['type']
  }

  lookupStructType(name: string, row: number, col: number, lexer: Lexer): StructType {
    const frame = this.getFrameWithName(name)
    if (frame == null) {
      throw new Error(lexer.formatError("variable has incomplete type '" + name + "'", row, col))
    }
    return frame.boundings[name]['val']
  }

  private isRedefinition(name: string, type: DataType): boolean {
    if (!(name in this.boundings)) {
      return false
    } else if (type != PrimitiveTypes.function) {
      return true
    } else if (
      this.boundings[name]['val'] instanceof SelfDefinedFunction &&
      !this.boundings[name]['val'].isDefined()
    ) {
      return false
    }
    return true
  }

  allocateStringLiteral(stringLiteral: string): NumericLiteral {
    const addr = this.memory.allocateStringLiteral(stringLiteral)
    return NumericLiteral.new(addr).castToType(new PointerType(PrimitiveTypes.char))
  }

  private checkRedefinition(
    name: string,
    type: DataType,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ) {
    if (this.isRedefinition(name, type)) {
      let errMsg = "redefinition of '" + name + "'"
      if (lexer != null) {
        errMsg = lexer.formatError(errMsg, row, col)
      }
      throw new Error(errMsg)
    }
  }

  private conflictingFunctionSignatures(
    name: string,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ) {
    let errMsg = "conflicting signatures of function '" + name + "'"
    if (lexer != null) {
      errMsg = lexer.formatError(errMsg, row, col)
    }
    throw new Error(errMsg)
  }

  declareFunction(
    name: string,
    functionObj: Function,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ): string {
    this.checkRedefinition(name, PrimitiveTypes.function, row, col, lexer)
    if (
      name in this.boundings &&
      (this.boundings[name]['val'] as Function).toString() != functionObj.toString()
    ) {
      this.conflictingFunctionSignatures(name, row, col, lexer)
    }
    this.boundings[name] = { type: PrimitiveTypes.function, val: functionObj }
    // console.log('declared function: ' + functionObj.toString() + ' [' + this.stackTop + ']')
    return name
  }

  declareStructType(
    structType: StructType,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ): StructType {
    this.checkRedefinition(structType.toString(), structType, row, col, lexer)
    this.boundings[structType.toString()] = { type: 'struct type', val: structType }
    return structType
  }

  declareVariable(
    name: string,
    type: DataType,
    row: number = -1,
    col: number = -1,
    lexer: Lexer | null = null
  ): string {
    this.checkRedefinition(name, type, row, col, lexer)
    const eleSize = (type instanceof ArrayType ? type.getEleType() : type).getSize()
    if ((this.stackTop % 4) + eleSize > 4) {
      this.stackTop = Math.ceil(this.stackTop / 4) * 4
    }
    if (this.stackTop + type.getSize() > this.memory.getSize()) {
      let errMsg = 'stack out of memory'
      if (lexer != null) {
        errMsg = lexer.formatError(errMsg, row, col)
      }
      throw new Error(errMsg)
    }
    this.boundings[name] = { type: type, val: this.stackTop }
    this.stackTop += type.getSize()
    // console.log('declared variable: ' + name + ':' + type + ' [' + this.stackTop + ']')
    return name
  }

  initializeStruct(name: string, initialValues: NumericLiteral[]): void {
    let addr = this.boundings[name]['val']
    initialValues.forEach(value => {
      this.assignValueByAddress(addr, value)
      addr += value.getDataType().getSize()
    })
  }

  initializeArray(name: string, initialValues: NumericLiteral[]): void {
    let addr = this.boundings[name]['val']
    for (let i = 0; i < initialValues.length; i++) {
      // console.log(
      //   'assign: ' +
      //     JSON.stringify(initialValues[i]) +
      //     ' to address ' +
      //     startAddr +
      //     i * sizeof(eleType)
      // )
      this.memory.writeNumeric(addr, initialValues[i])
      addr += initialValues[i].getDataType().getSize()
    }
  }

  assignValueByAddress(address: number, value: NumericLiteral) {
    this.memory.writeNumeric(address, value)
  }

  assignValue(name: string, val: NumericLiteral): NumericLiteral {
    const variableType = this.lookupType(name)
    const address = this.findFrameWith(name).boundings[name]['val']
    if (
      variableType instanceof PointerType ||
      variableType == PrimitiveTypes.int ||
      variableType == PrimitiveTypes.float ||
      variableType == PrimitiveTypes.char
    ) {
      this.memory.writeNumeric(address, (val as NumericLiteral).castToType(variableType))
    } else if (variableType instanceof StructType) {
      this.memory.copyBytes(address, (val as NumericLiteral).getValue(), variableType.getSize())
    } else {
      throw new Error("attempt to assign to unknown varialble type '" + variableType + "'")
    }
    return val
  }

  copyString(dst: NumericLiteral, src: NumericLiteral, len: number): void {
    const stringLiteral = this.memory.readStringLiteral(src.getValue())
    const actualLen = Math.max(Math.min(len, stringLiteral.length), 0)
    this.memory.copyBytes(dst.getValue(), src.getValue(), actualLen)
    this.memory.writeNumeric(
      dst.getValue() + actualLen,
      NumericLiteral.new(0).castToType(PrimitiveTypes.char)
    )
  }

  dereferenceAsString(numeric: NumericLiteral): string {
    const type = numeric.getDataType()
    if (!(type instanceof PointerType || type instanceof ArrayType)) {
      throw new Error("attempt to dereference non-pointer type '" + type + "' to 'char*'")
    } else if (type.dereference() != PrimitiveTypes.char) {
      throw new Error("attempt to dereference type '" + type + "' to 'char*'")
    }
    return this.memory.readStringLiteral(numeric.getValue())
  }

  dereference(numeric: NumericLiteral): NumericLiteral {
    // console.log('dereference: ' + JSON.stringify(numeric))
    const type = numeric.getDataType()
    if (!(type instanceof PointerType || type instanceof ArrayType)) {
      throw new Error("attempt to dereference non-pointer type '" + type + "'")
    }
    const val = numeric.getValue()
    const resultType = type.dereference()
    if (resultType instanceof ArrayType) {
      return NumericLiteral.new(val).castToType(resultType)
    } else if (resultType instanceof StructType) {
      return this.memory
        .readPointer(val, new PointerType(PrimitiveTypes.void))
        .castToType(resultType, true)
    } else if (resultType instanceof PointerType) {
      return this.memory.readPointer(val, resultType)
    } else if (resultType == PrimitiveTypes.char) {
      return this.memory.readChar(val)
    } else if (resultType == PrimitiveTypes.int) {
      return this.memory.readInt(val)
    } else if (resultType == PrimitiveTypes.float) {
      return this.memory.readFloat(val)
    } else {
      throw new Error("attempt to dereference unknown pointer type '" + type + "'")
    }
  }

  allocateOnHeap(numeric: NumericLiteral): NumericLiteral {
    return this.memory.allocate(numeric.getValue())
  }

  free(numeric: NumericLiteral) {
    this.memory.free(numeric.getValue())
  }

  printHeap(context: CProgramContext) {
    this.memory.printHeap(context)
  }

  static extendWithStackTop(prev: Frame, stackTop: number) {
    return new Frame(prev, stackTop, prev.memory, prev.depth + 1)
  }

  static extend(prev: Frame) {
    return this.extendWithStackTop(prev, prev.stackTop)
  }

  private recurPrintEnv(context: CProgramContext) {
    if (this.prev != null) {
      this.prev.recurPrintEnv(context)
    }
    context.stdout += '='.repeat(20) + 'depth: ' + String(this.depth) + '='.repeat(20) + '\n'
    const names = Object.keys(this.boundings)
    if (this.depth == 0) {
      names.push('sizeof')
      names.push('typeof')
    }
    names.sort().forEach(name => {
      if (name == 'sizeof') {
        context.stdout += name + ': int sizeof(any)\n'
        return
      } else if (name == 'typeof') {
        context.stdout += name + ': char* typeof(any)\n'
        return
      }
      const type = this.boundings[name]['type']
      if (type == PrimitiveTypes.function) {
        context.stdout += name + ': ' + this.boundings[name]['val'].toString() + '\n'
      } else {
        context.stdout += name + ': ' + type.toString() + '\n'
      }
    })
  }

  printEnv(context: CProgramContext) {
    context.stdout += '\n'
    this.recurPrintEnv(context)
    context.stdout += '='.repeat(21) + 'ENDING' + '='.repeat(21) + '\n'
  }
}
