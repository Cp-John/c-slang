import { NumericLiteral } from '../entity/expression/numericLiteral'
import { PointerType, PrimitiveType } from '../interpreter/builtins'

export class Memory {
  private buffer: ArrayBuffer
  private view: DataView
  static readonly DEFAULT_MEMORY_SIZE = Math.pow(2, 20)

  constructor(size: number = Memory.DEFAULT_MEMORY_SIZE) {
    this.buffer = new ArrayBuffer(size)
    this.view = new DataView(this.buffer)
  }

  private assertValidAddress(address: number, isRead: boolean) {
    if (address < 0 || address >= this.view.byteLength) {
      throw new Error((isRead ? 'read from' : 'write to') + ' invalid address: ' + String(address))
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

  writeStringLiteral(address: number, stringLiteral: string): number {
    this.assertValidAddress(address, false)
    const lastAddr = address + stringLiteral.length - 2
    if (lastAddr >= this.view.byteLength) {
      throw new Error('insufficient memory to write string literal ' + stringLiteral)
    }
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      this.view.setUint8(address + i - 1, stringLiteral.charCodeAt(i))
    }
    this.view.setUint8(lastAddr, 0)
    return Math.ceil((lastAddr + 1) / 4) * 4
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
}
