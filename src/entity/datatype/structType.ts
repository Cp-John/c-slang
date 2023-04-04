import { ArrayType, ElementType } from './arrayType'
import { DataType } from './dataType'

export class StructType extends DataType {
  private tag: string
  private fields: [string, DataType][]
  private _isComplete: boolean

  static getIncomplete(tag: string) {
    return new StructType(tag, [], false)
  }

  override isComplete(): boolean {
    return this._isComplete
  }

  getFieldMemOffset(fieldName: string): number {
    let offset = 0
    for (let i = 0; i < this.fields.length; i++) {
      if (this.fields[i][0] == fieldName) {
        return offset
      }
      offset += this.fields[i][1].getSize()
    }
    throw new Error('impossible execution path')
  }

  getFieldType(fieldName: string): DataType | undefined {
    for (let i = 0; i < this.fields.length; i++) {
      if (this.fields[i][0] == fieldName) {
        return this.fields[i][1]
      }
    }
    return undefined
  }

  defaultInitialExpressions(): Expression[] {
    const result: Expression[] = []
    this.fields.forEach(([fieldName, fieldType]) => {
      if (fieldType instanceof ArrayType || fieldType instanceof StructType) {
        fieldType.defaultInitialExpressions().forEach(expr => result.push(expr))
      } else {
        result.push(Expression.of(NumericLiteral.new(0).castToType(fieldType)))
      }
    })
    return result
  }

  parseInitialExpressions(env: Frame, lexer: Lexer): Expression[] {
    lexer.eatDelimiter('{')
    const result: Expression[] = []
    let fieldId = 0
    while (!lexer.matchDelimiter('}') && fieldId < this.fields.length) {
      const fieldType = this.fields[fieldId][1]
      if (fieldType instanceof ArrayType) {
        fieldType.parseInitialArrayExpressions(env, lexer, result)
      } else if (fieldType instanceof StructType) {
        fieldType.parseInitialExpressions(env, lexer).forEach(expr => result.push(expr))
      } else {
        result.push(ExpressionParser.parse(env, lexer, false, false, fieldType, false))
      }
      fieldId += 1
      if (!lexer.matchDelimiter('}')) {
        lexer.eatDelimiter(',')
      }
    }
    lexer.eatDelimiter('}')
    while (fieldId < this.fields.length) {
      const fieldType = this.fields[fieldId][1]
      if (fieldType instanceof ArrayType || fieldType instanceof StructType) {
        fieldType.defaultInitialExpressions().forEach(expr => result.push(expr))
      } else {
        result.push(Expression.of(NumericLiteral.new(0).castToType(fieldType)))
      }
      fieldId += 1
    }
    return result
  }

  parseDefinitionBody(env: Frame, lexer: Lexer): StructType {
    lexer.eatDelimiter('{')
    const declaredFieldNames = new Set<string>()
    this.fields = []
    this.size = 0
    while (!lexer.matchDelimiter('}')) {
      let fieldType: DataType = lexer.eatElementType(env)
      const [row, col] = lexer.tell()
      const fieldName = lexer.eatIdentifier()
      if (!fieldType.isComplete()) {
        throw new Error(
          lexer.formatError("variable has incomplete type '" + fieldType.toString() + "'", row, col)
        )
      }
      if (declaredFieldNames.has(fieldName)) {
        throw new Error(lexer.formatError("redefinition of '" + fieldName + "'", row, col))
      }
      if (lexer.matchDelimiter('[')) {
        fieldType = ArrayType.wrap(env, lexer, fieldType as ElementType)
      }
      this.fields.push([fieldName, fieldType])
      declaredFieldNames.add(fieldName)
      this.size += fieldType.getSize()
      lexer.eatDelimiter(';')
    }
    lexer.eatDelimiter('}')
    this._isComplete = true
    return this
  }

  private constructor(tag: string, fields: [string, DataType][], isComplete: boolean) {
    let size = 0
    fields.forEach(([fieldName, fieldType]) => {
      size += fieldType.getSize()
    })
    super(size)
    this.tag = tag
    this.fields = fields
    this._isComplete = isComplete
  }

  override applyBinaryOperator(operator: string, rightType: DataType): DataType | undefined {
    return undefined
  }

  toString(): string {
    return 'struct ' + this.tag
  }

  override canImplicitCastTo(targetType: DataType): boolean {
    return this.toString() == targetType.toString()
  }

  override canExplicitCastTo(targetType: DataType): boolean {
    return this.toString() == targetType.toString()
  }
}

import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression } from '../expression/expression'
import { ExpressionParser } from '../expression/expressionParser'
import { NumericLiteral } from '../expression/numericLiteral'
