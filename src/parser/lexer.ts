import { CHAR_MAX, CHAR_MIN, INT_MAX, INT_MIN, M_PI, RAND_MAX, UINT_MAX } from '../entity/constant'
import { ElementType, NonPointerLikeType } from '../entity/datatype/arrayType'
import { PointerType } from '../entity/datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../entity/datatype/primitiveType'
import { StructType } from '../entity/datatype/structType'
import { NumericLiteral } from '../entity/expression/numericLiteral'
import { Frame } from '../interpreter/frame'

const PREPROCESSOR_DIRECTIVEG =
  /^\s*#include\b|^\s*#define\b|^\s*#\s*ifdef\b|^\s*#\s*ifndef\b|^\s*#\s*if\b|^\s*#\s*elif\b|^\s*#\s*else\b|^\s*#\s*pragma\b/
const NUMBER_REGEX = /^[+-]?([0-9]*[.])?[0-9]+/
const IDENTIFIER_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*/
const STRING_LITERAL_REGEX = /^".*?(?<!\\)"/
const CHARACTER_LITERAL_REGEX = /^'.(?<!\\)'|^'\\[abfnrtv'"?]'|^'\\\\'|^'\\0'/
const DATA_TYPE_REGEX = /^int\b|^char\b|^float\b|^double\b|^void\b/
const SPACE_REGEX = /^\s+/
const PRIORITIZED_ARITHMETIC_OPERATOR_REGEX = /^[*\/%](?!=)/
const ARITHMETIC_OPERATOR_REGEX = /^[*\/%\+](?!=)|^-(?![=|>])/
const INCREMENT_DECREMENT_REGEX = /^\+\+|^--/
const UNARY_PLUS_MINUS = /^\+(?!\+)|^-(?!-)/
const RELATIONAL_OPERATOR_RETEX = /^>=|^<=|^>|^<|^==|^!=/
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
  'typeof',
  'struct',
  'NULL',
  'RAND_MAX',
  'INT_MAX',
  'INT_MIN',
  'CHAR_MAX',
  'CHAR_INT',
  'UINT_MAX',
  'M_PI'
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
  private macroDefinitions: Map<string, string> = new Map([
    ['RAND_MAX', String(RAND_MAX)],
    ['INT_MAX', String(INT_MAX)],
    ['INT_MIN', String(INT_MIN)],
    ['CHAR_MAX', String(CHAR_MAX)],
    ['CHAR_MIN', String(CHAR_MIN)],
    ['UINT_MAX', String(UINT_MAX)],
    ['M_PI', String(M_PI)]
  ])

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

  private replaceMacros(str: string): string {
    if (str.length == 0) {
      return str
    }
    let result = str
    this.macroDefinitions.forEach((value, key) => {
      result = result.replaceAll(new RegExp('\\b' + key + '\\b', 'g'), value)
    })
    return result
  }

  private preprocess(str: string): string {
    let result = ''
    let temp = str
    while (temp.length > 0) {
      const doubleQuoteIdx = temp.indexOf('"')
      const singleQuoteIdx = temp.indexOf("'")
      if (doubleQuoteIdx == -1 && singleQuoteIdx == -1) {
        // do nothing
        result += this.replaceMacros(temp)
        return result
      }
      let another = -1
      if (doubleQuoteIdx != -1 && singleQuoteIdx != -1) {
        if (doubleQuoteIdx < singleQuoteIdx) {
          result += this.replaceMacros(temp.substring(0, doubleQuoteIdx))
          temp = temp.substring(doubleQuoteIdx)
          another = temp.indexOf('"', 1)
        } else {
          result += this.replaceMacros(temp.substring(0, singleQuoteIdx))
          temp = temp.substring(singleQuoteIdx)
          another = temp.indexOf("'", 1)
        }
      } else if (doubleQuoteIdx != -1) {
        result += this.replaceMacros(temp.substring(0, doubleQuoteIdx))
        temp = temp.substring(doubleQuoteIdx)
        another = temp.indexOf('"', 1)
      } else {
        result += this.replaceMacros(temp.substring(0, singleQuoteIdx))
        temp = temp.substring(singleQuoteIdx)
        another = temp.indexOf("'", 1)
      }
      if (another == -1) {
        return result + temp
      } else {
        result += temp.substring(0, another + 1)
        temp = temp.substring(another + 1)
      }
    }
    return result
  }

  private skipToNextLine(): void {
    if (this.row < this.lines.length) {
      this.lines[this.row] = this.preprocess(this.lines[this.row])
      this.currentLine = this.lines[this.row]
      this.row += 1
      this.col = 1

      const match = PREPROCESSOR_DIRECTIVEG.exec(this.currentLine)

      if (match == null) {
        return
      } else if (match[0] == '#include') {
        this.skipToNextLine()
      } else if (match[0] == '#define') {
        this.eatKeyword('#define')
        const constName = this.eatIdentifier()
        if (this.currentLine.length > 0 && !new RegExp(/^\s/).test(this.currentLine)) {
          throw new Error(this.formatError('expected a whitespace after the macro name'))
        }
        let expression = this.currentLine
        if (expression.includes('//')) {
          expression = expression.substring(0, expression.indexOf('//'))
        }
        expression = expression.trim()
        if (expression.length == 0) {
          throw new Error(this.formatError('expected value or expression for macro definition'))
        }
        this.macroDefinitions.set(constName, expression)
        this.col += this.currentLine.length
        this.currentLine = ''
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
    return this.hasNext() && (DATA_TYPE_REGEX.test(this.currentLine) || this.matchKeyword('struct'))
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
    return match[0] == 'double'
      ? PrimitiveTypes.float
      : match[0] == 'float'
      ? PrimitiveTypes.float
      : match[0] == 'int'
      ? PrimitiveTypes.int
      : match[0] == 'char'
      ? PrimitiveTypes.char
      : PrimitiveTypes.void
  }

  eatStructType(env: Frame): StructType {
    const keyword = this.eatKeyword('struct')
    const [row, col] = this.tell()
    return env.lookupStructType(keyword + ' ' + this.eatIdentifier(), row, col, this)
  }

  eatNonPointerLikeType(env: Frame): NonPointerLikeType {
    if (this.matchKeyword('struct')) {
      return this.eatStructType(env)
    } else {
      return this.eatPrimitiveDataType()
    }
  }

  eatElementType(env: Frame): ElementType {
    return this.wrapType(this.eatNonPointerLikeType(env))
  }

  wrapType(nonPointerLikeType: NonPointerLikeType): ElementType {
    let finalType: ElementType = nonPointerLikeType
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
      PrimitiveTypes.char
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

  static isAsciiChar(ch: string): boolean {
    return ch.charCodeAt(0) >= 0 && ch.charCodeAt(0) <= 127
  }

  private checkNonAsciiCharacter(stringLiteral: string): void {
    for (let i = 1; i < stringLiteral.length - 1; i++) {
      if (!Lexer.isAsciiChar(stringLiteral[i])) {
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
