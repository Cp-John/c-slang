import { NumericLiteral } from '../entity/expression/numericLiteral'
import {
  DataType,
  PointerType,
  PrimitiveType,
  WHOLE_PRIMITIVE_TYPES
} from '../interpreter/builtins'

const PREPROCESSOR_DIRECTIVEG =
  /^\s*#\s*include\b|^\s*#\s*define\b|^\s*#\s*ifdef\b|^\s*#\s*ifndef\b|^\s*#\s*if\b|^\s*#\s*elif\b|^\s*#\s*else\b|^\s*#\s*pragma\b/
const NUMBER_REGEX = /^[+-]?([0-9]*[.])?[0-9]+/
const IDENTIFIER_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*/
const STRING_LITERAL_REGEX = /^".*?(?<!\\)"/
const CHARACTER_LITERAL_REGEX = /^'.(?<!\\)'|^'\\[abfnrtv'"?]'|^'\\\\'|^'\\0'/
const DATA_TYPE_REGEX = /^int\b|^char\b|^float\b|^double\b|^void\b/
const SPACE_REGEX = /^\s+/
const PRIORITIZED_ARITHMETIC_OPERATOR_REGEX = /^[*\/%](?!=)/
const ARITHMETIC_OPERATOR_REGEX = /^[*\/%\+-](?!=)/
const INCREMENT_DECREMENT_REGEX = /^\+\+|^--/
const UNARY_PLUS_MINUS = /^\+(?!\+)|^-(?!-)/
export const RELATIONAL_OPERATOR_RETEX = /^>=|^<=|^>|^<|^==|^!=/
const PRIORITIZED_RELATIONAL_OPERATOR_REGEX = /^>=|^<=|^>|^</
const ASSIGNMENT_OPERATOR_REGEX = /^\+=|^-=|^\*=|^\/=|^%=|^=/

const RESERVED_KEYWORDS = new Set([
  'void',
  'int',
  'char',
  'float',
  'double',
  'break',
  'continue',
  'return',
  'if',
  'else',
  'while',
  'do',
  'for',
  'switch',
  'case',
  'default',
  'sizeof',
  'typeof'
])

const ESCAPE_CHARACTERS = {
  '\\a': 'a',
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t',
  '\\v': '\v',
  "\\'": "'",
  '\\"': '"',
  '\\?': '?',
  '\\\\': '\\',
  '\\0': '\0'
}

export class Lexer {
  private lines: string[]
  private row: number
  private col: number
  private currentLine: string

  constructor(source: string) {
    this.lines = source.split(/\r?\n/)
    this.row = 0
    this.col = 0
    this.skipToNextLine()
  }

  tell(): [number, number] {
    this.hasNext()
    return [this.row, this.col]
  }

  private trimHead() {
    const spaces = SPACE_REGEX.exec(this.currentLine)
    if (spaces) {
      this.col += spaces[0].length
      this.currentLine = this.currentLine.substring(spaces[0].length)
    }
  }

  hasNext(): boolean {
    this.trimHead()
    while (this.row < this.lines.length && this.currentLine.length === 0) {
      this.skipToNextLine()
      this.trimHead()
    }
    if (this.currentLine.startsWith('//')) {
      this.skipToNextLine()
      return this.hasNext()
    }
    return this.currentLine.length > 0
  }

  private skipToNextLine(): void {
    if (this.row < this.lines.length) {
      this.currentLine = this.lines[this.row]
      this.row += 1
      this.col = 1
      const match = PREPROCESSOR_DIRECTIVEG.exec(this.currentLine)
      if (match == null) {
        return
      } else if (match[0].includes('include')) {
        this.skipToNextLine()
      } else {
        throw new Error(this.formatError('preprocessor directive is not supported'))
      }
    } else {
      this.col += this.currentLine.length
      this.currentLine = ''
    }
  }

  formatError(msg: string, row: number = this.row, col: number = this.col): string {
    return (
      'Line ' +
      String(row) +
      ': ' +
      (msg +
        ' at (' +
        row +
        ', ' +
        col +
        ')\n\t' +
        this.lines[row - 1] +
        '\n\t' +
        ' '.repeat(col - 1) +
        '^')
    )
  }

  matchNumber(): boolean {
    return this.hasNext() && NUMBER_REGEX.test(this.currentLine)
  }

  eatNumber(): NumericLiteral {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a number'))
    }
    const match = NUMBER_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a number'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return NumericLiteral.parse(match[0])
  }

  matchIdentifier(): boolean {
    if (!this.hasNext()) {
      return false
    }
    const match = IDENTIFIER_REGEX.exec(this.currentLine)
    return match != null && !RESERVED_KEYWORDS.has(match[0])
  }

  eatIdentifier(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an identifier'))
    }
    const match = IDENTIFIER_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected an identifier'))
    } else if (RESERVED_KEYWORDS.has(match[0])) {
      throw new Error(this.formatError('"' + match[0] + '" is a reserved keyword'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  matchKeyword(keyword: string): boolean {
    return this.hasNext() && new RegExp('^' + keyword + '\\b').test(this.currentLine)
  }

  eatKeyword(keyword: string): string {
    if (!this.matchKeyword(keyword)) {
      throw new Error(this.formatError('expected a keyword "' + keyword + '"'))
    }
    this.currentLine = this.currentLine.substring(keyword.length)
    this.col += keyword.length
    return keyword
  }

  matchDelimiter(delim: string) {
    return this.hasNext() && this.currentLine.startsWith(delim)
  }

  eatDelimiter(delim: string) {
    if (!this.hasNext() || !this.currentLine.startsWith(delim)) {
      throw new Error(this.formatError('expected a delimiter "' + delim + '"'))
    }
    this.currentLine = this.currentLine.substring(delim.length)
    this.col += delim.length
  }

  matchDataType(): boolean {
    return this.hasNext() && DATA_TYPE_REGEX.test(this.currentLine)
  }

  eatPrimitiveDataType(): PrimitiveType {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a datatype'))
    }
    const match = DATA_TYPE_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a datatype'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0] == 'double' ? PrimitiveType.FLOAT : (match[0] as PrimitiveType)
  }

  eatDataType(): PrimitiveType | PointerType {
    return this.wrapType(this.eatPrimitiveDataType())
  }

  wrapType(primitiveType: PrimitiveType): PrimitiveType | PointerType {
    let finalType: PrimitiveType | PointerType = primitiveType
    while (this.matchDelimiter('*')) {
      this.eatDelimiter('*')
      finalType = new PointerType(finalType)
    }
    return finalType
  }

  matchPrioritizedArithmeticOperator(): boolean {
    return this.hasNext() && PRIORITIZED_ARITHMETIC_OPERATOR_REGEX.test(this.currentLine)
  }

  matchArithmeticOperator(): boolean {
    return this.hasNext() && ARITHMETIC_OPERATOR_REGEX.test(this.currentLine)
  }

  eatArithmeticOperator(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an arithmetic operator'))
    }
    const match = ARITHMETIC_OPERATOR_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected an arithmetic operator'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  matchIncrementDecrementOperator(): boolean {
    return this.hasNext() && INCREMENT_DECREMENT_REGEX.test(this.currentLine)
  }

  eatIncrementDecrementOperator(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an increment or decrement operator'))
    }
    const match = INCREMENT_DECREMENT_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected an increment or decrement operator'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  matchPrioritizedRelationalOperator(): boolean {
    return this.hasNext() && PRIORITIZED_RELATIONAL_OPERATOR_REGEX.test(this.currentLine)
  }

  matchRelationalOperator(): boolean {
    return this.hasNext() && RELATIONAL_OPERATOR_RETEX.test(this.currentLine)
  }

  eatRelationalOperator(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a relational operator'))
    }
    const match = RELATIONAL_OPERATOR_RETEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a relational operator'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  matchAssignmentOperator(): boolean {
    return this.hasNext() && ASSIGNMENT_OPERATOR_REGEX.test(this.currentLine)
  }

  eatAssignmentOperator(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an assignment operator'))
    }
    const match = ASSIGNMENT_OPERATOR_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected an assignment operator'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  eatCharacterLiteral(): NumericLiteral {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an ascii character literal'))
    }
    const match = CHARACTER_LITERAL_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected an ascii character literal'))
    }
    this.checkNonAsciiCharacter(match[0])
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return NumericLiteral.new(Lexer.restoreEscapeChars(match[0]).charCodeAt(1)).castToType(
      PrimitiveType.CHAR
    )
  }

  matchUnaryPlusMinus(): boolean {
    return this.hasNext() && UNARY_PLUS_MINUS.test(this.currentLine)
  }

  eatUnaryPlusMinus(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a unary plus or minus operator'))
    }
    const match = UNARY_PLUS_MINUS.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a unary plus or minus operator'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
  }

  private static restoreEscapeChars(original: string): string {
    let result = original
    for (const toReplace in ESCAPE_CHARACTERS) {
      result = result.replaceAll(toReplace, ESCAPE_CHARACTERS[toReplace])
    }
    return result
  }

  private checkNonAsciiCharacter(stringLiteral: string): void {
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      const charCode = stringLiteral.charCodeAt(i)
      if (charCode > 127 || charCode < 0) {
        throw new Error(this.formatError('expected an ascii character', this.row, this.col + i))
      }
    }
  }

  eatStringLiteral(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a string literal'))
    }
    const match = STRING_LITERAL_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a string literal'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.checkNonAsciiCharacter(match[0])
    this.col += match[0].length
    return Lexer.restoreEscapeChars(match[0])
  }

  assertEndOfLine() {
    const currentRow = this.row
    if (this.hasNext() && this.row == currentRow) {
      throw new Error(this.formatError('expected a line break'))
    }
  }
}
