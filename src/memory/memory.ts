import { NumericLiteral } from '../entity/expression/numericLiteral'
import { PointerType, PrimitiveType } from '../interpreter/builtins'

export class Memory {
  private buffer: ArrayBuffer
  private view: DataView
  private words: number
  static readonly WORD_SIZE = 8
  static allocatedMemory: Memory | null = null
  static readonly DEFAULT_MEMORY_SIZE = Math.pow(2, 20)

  private constructor(size: number) {
    this.buffer = new ArrayBuffer(size * Memory.WORD_SIZE)
    this.view = new DataView(this.buffer)
    this.words = size
  }

  static clearMemory(): void {
    Memory.allocatedMemory = null
  }

  static getOrAllocate(size: number = Memory.DEFAULT_MEMORY_SIZE): Memory {
    if (Memory.allocatedMemory == null) {
      Memory.allocatedMemory = new Memory(size)
    }
    return Memory.allocatedMemory
  }

  getNumWords(): number {
    return this.words
  }

  private assertValidAddress(address: number, isRead: boolean) {
    if (address < 0 || address >= this.words) {
      throw new Error((isRead ? 'read from' : 'write to') + ' invalid address: ' + String(address))
    }
  }

  readInt(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getInt32(address * Memory.WORD_SIZE)).castToType(
      PrimitiveType.INT
    )
  }

  writeNumeric(address: number, numeric: NumericLiteral): number {
    this.assertValidAddress(address, false)
    if (numeric.getDataType() instanceof PointerType) {
      this.view.setInt32(address * Memory.WORD_SIZE, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.INT) {
      this.view.setInt32(address * Memory.WORD_SIZE, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.FLOAT) {
      this.view.setFloat32(address * Memory.WORD_SIZE, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.CHAR) {
      this.view.setInt8(address * Memory.WORD_SIZE, numeric.getValue())
    } else {
      throw new Error("attempt to write datatype '" + numeric.getDataType() + "' as numeric type")
    }
    return address + 1
  }

  readFloat(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getFloat32(address * Memory.WORD_SIZE)).castToType(
      PrimitiveType.FLOAT
    )
  }

  readChar(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getInt8(address * Memory.WORD_SIZE)).castToType(
      PrimitiveType.CHAR
    )
  }

  writeStringLiteral(address: number, stringLiteral: string): number {
    this.assertValidAddress(address, false)
    const addr = address * Memory.WORD_SIZE
    const lastAddr = addr + stringLiteral.length - 2
    if (lastAddr >= this.view.byteLength) {
      throw new Error('insufficient memory to write string literal ' + stringLiteral)
    }
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      this.view.setUint8(addr + i - 1, stringLiteral.charCodeAt(i))
    }
    this.view.setUint8(lastAddr, 0)
    return lastAddr >> (3 + ((lastAddr & 7) > 0 ? 1 : 0))
  }

  readStringLiteral(address: number): string {
    this.assertValidAddress(address, true)
    let addr = address * Memory.WORD_SIZE
    let stringLiteral = ''
    while (addr < this.view.byteLength) {
      const val = this.view.getUint8(addr)
      if (val == 0) {
        break
      }
      stringLiteral += String.fromCharCode(val)
      addr++
    }
    return stringLiteral
  }
}
