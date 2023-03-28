import { NumericLiteral } from '../entity/expression/numericLiteral'
import { PointerType, PrimitiveType } from '../interpreter/builtins'

export class Memory {
  private buffer: ArrayBuffer
  protected view: DataView
  private allocatedAddresses: Set<number>
  private stringLiteralToAddress: Map<string, number>
  private readonlyTop: number
  private stackBottom: number // the start address of stack
  private heapBottom: number

  // address from low to high: readonly memory => heap => stack
  static readonly DEFAULT_READONLY_MEMORY_SIZE = Math.pow(2, 10)
  static readonly DEFAULT_HEAP_SIZE = Math.pow(2, 18)
  static readonly DEFAULT_STACK_SIZE = Math.pow(2, 18)

  // heap tag design: address of previous node (4 bytes) + free bit (1 bit) + length (4 bytes - 1 bit)
  private static readonly FREE_LENGTH_OFFSET = 4
  private static readonly TAG_LENGTH = 8

  constructor() {
    this.buffer = new ArrayBuffer(
      Memory.DEFAULT_READONLY_MEMORY_SIZE + Memory.DEFAULT_HEAP_SIZE + Memory.DEFAULT_STACK_SIZE
    )
    this.view = new DataView(this.buffer)
    this.allocatedAddresses = new Set<number>()
    this.stringLiteralToAddress = new Map<string, number>()
    this.readonlyTop = 0
    this.stackBottom = Memory.DEFAULT_READONLY_MEMORY_SIZE + Memory.DEFAULT_HEAP_SIZE
    this.heapBottom = Memory.DEFAULT_READONLY_MEMORY_SIZE
    this.setTag(this.heapBottom, this.heapBottom, true, Memory.DEFAULT_HEAP_SIZE)
  }

  getStackBottom(): number {
    return this.stackBottom
  }

  private assertValidAddress(address: number, isRead: boolean) {
    if (address < 0 || address >= this.view.byteLength) {
      throw new Error((isRead ? 'read from' : 'write to') + ' invalid address: ' + String(address))
    } else if (!isRead && address < this.heapBottom) {
      throw new Error('attempt to write to readonly memory')
    }
  }

  readInt(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getInt32(address), address).castToType(
      PrimitiveType.INT,
      true
    )
  }

  readPointer(address: number, type: PointerType): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getInt32(address), address).castToType(type, true)
  }

  writeNumeric(address: number, numeric: NumericLiteral): number {
    this.assertValidAddress(address, false)
    if (numeric.getDataType() instanceof PointerType) {
      this.view.setInt32(address, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.INT) {
      this.view.setInt32(address, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.FLOAT) {
      this.view.setFloat32(address, numeric.getValue())
    } else if (numeric.getDataType() == PrimitiveType.CHAR) {
      // word alignment
      this.view.setUint8(address, numeric.getValue())
    } else {
      throw new Error("attempt to write datatype '" + numeric.getDataType() + "' as numeric type")
    }
    return address + 4
  }

  readFloat(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getFloat32(address), address).castToType(
      PrimitiveType.FLOAT,
      true
    )
  }

  readChar(address: number): NumericLiteral {
    this.assertValidAddress(address, true)
    return NumericLiteral.new(this.view.getUint8(address), address).castToType(
      PrimitiveType.CHAR,
      true
    )
  }

  allocateStringLiteral(stringLiteral: string): number {
    const exist = this.stringLiteralToAddress.get(stringLiteral)
    if (exist != undefined) {
      return exist
    }
    const lastAddr = this.readonlyTop + stringLiteral.length - 2
    const addr = this.readonlyTop
    if (lastAddr >= this.heapBottom) {
      throw new Error('insufficient memory to allocate string literal ' + stringLiteral)
    }
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      this.view.setUint8(addr + i - 1, stringLiteral.charCodeAt(i))
    }
    this.view.setUint8(lastAddr, 0)
    this.readonlyTop = lastAddr + 1
    this.stringLiteralToAddress.set(stringLiteral, addr)
    return addr
  }

  readStringLiteral(address: number): string {
    this.assertValidAddress(address, true)
    let addr = address
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

  private setTag(address: number, prev: number, free: boolean, length: number): void {
    this.setPrev(address, prev)
    this.setIsFree(address, free)
    this.setLength(address, length)
  }

  private setPrev(address: number, prev: number): void {
    this.view.setUint32(address, prev)
  }

  private getPrev(address: number): number {
    return this.view.getUint32(address)
  }

  private setIsFree(address: number, free: boolean) {
    // free bit is 0 if free else 1
    const oldVal = this.view.getUint32(address + Memory.FREE_LENGTH_OFFSET)
    const newVal = free ? oldVal & (Math.pow(2, 31) - 1) : oldVal | Math.pow(2, 31)
    this.view.setUint32(address + Memory.FREE_LENGTH_OFFSET, newVal)
  }

  private isFree(address: number): boolean {
    return (this.view.getUint32(address + Memory.FREE_LENGTH_OFFSET) & Math.pow(2, 31)) == 0
  }

  private setLength(address: number, length: number) {
    const freeBit = this.isFree(address) ? 0 : 1
    this.view.setUint32(address + Memory.FREE_LENGTH_OFFSET, length | (freeBit << 31))
  }

  private getLength(address: number): number {
    return this.view.getUint32(address + Memory.FREE_LENGTH_OFFSET) & (Math.pow(2, 31) - 1)
  }

  free(address: number): void {
    if (!this.allocatedAddresses.has(address)) {
      throw new Error('pointer being freed was not allocated, at address ' + String(address))
    }
    this.allocatedAddresses.delete(address)
    const nodeAddr = address - Memory.TAG_LENGTH
    const prev = this.getPrev(nodeAddr)
    let newAddress = nodeAddr
    if (prev != nodeAddr && this.isFree(prev)) {
      this.setLength(prev, this.getLength(prev) + this.getLength(nodeAddr))
      newAddress = prev
    } else {
      this.setIsFree(nodeAddr, true)
    }
    const next = newAddress + this.getLength(newAddress)
    let newNext = next
    if (next < this.stackBottom && this.isFree(next)) {
      newNext = next + this.getLength(next)
      this.setLength(newAddress, this.getLength(newAddress) + this.getLength(next))
    }

    if (newNext < this.stackBottom) {
      this.setPrev(newNext, newAddress)
    }
  }

  allocate(size: number): NumericLiteral {
    if (size <= 0) {
      throw new Error('allocated memory size must be > 0, but got ' + String(size))
    }
    // real allocated size is multiple of 4 bytes
    let realSize = Math.ceil(size / 4) * 4
    let addr = this.heapBottom
    while (addr < this.stackBottom) {
      if (this.isFree(addr) && this.getLength(addr) - Memory.TAG_LENGTH >= realSize) {
        break
      }
      addr += this.getLength(addr)
    }
    if (addr >= this.stackBottom) {
      throw new Error('heap out of memory')
    }
    const originalLength = this.getLength(addr)
    if (originalLength - Memory.TAG_LENGTH > realSize + Memory.TAG_LENGTH) {
      this.setIsFree(addr, false)
      this.setLength(addr, realSize + Memory.TAG_LENGTH)

      this.setTag(addr + this.getLength(addr), addr, true, originalLength - this.getLength(addr))

      if (addr + originalLength < this.stackBottom) {
        this.setPrev(addr + originalLength, addr + this.getLength(addr))
      }
    } else {
      realSize = this.getLength(addr) - Memory.TAG_LENGTH
      this.setIsFree(addr, false)
    }
    this.allocatedAddresses.add(addr + Memory.TAG_LENGTH)
    return NumericLiteral.new(addr + Memory.TAG_LENGTH).castToType(
      new PointerType(PrimitiveType.VOID)
    )
  }
}
