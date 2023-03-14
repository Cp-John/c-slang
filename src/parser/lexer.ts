import { Frame } from '../interpreter/frame'

const PREPROCESSOR_DIRECTIVEG = /^\s*#\s*include\b|^\s*#\s*define\b/
const NUMBER_REGEX = /^[+-]?([0-9]*[.])?[0-9]+/
const IDENTIFIER_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*/
const STRING_LITERAL_REGEX = /^".*?(?<!\\)"/
const CHARACTER_LITERAL_REGEX = /^'.(?<!\\)'|^'\\[abfnrtv'"?]'|^'\\\\'/
const DATA_TYPE_REGEX = /^int\b|^char\b|^float\b/
const SPACE_REGEX = /^\s+/
const PRIORITIZED_ARITHMETIC_OPERATOR_REGEX = /^[*\/%](?!=)/
const ARITHMETIC_OPERATOR_REGEX = /^[*\/%\+-](?!=)/
const INCREMENT_DECREMENT_REGEX = /^\+\+|^--/
const RELATIONAL_OPERATOR_RETEX = /^>=|^<=|^>|^<|^==|^!=/
const PRIORITIZED_RELATIONAL_OPERATOR_REGEX = /^>=|^<=|^>|^</
const ASSIGNMENT_OPERATOR_REGEX = /^\+=|^-=|^\*=|^\/=|^%=|^=/

const RESERVED_KEYWORDS = new Set([
  'void',
  'int',
  'char',
  'float',
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
  'default'
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
  '\\\\': '\\'
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
      if (PREPROCESSOR_DIRECTIVEG.test(this.currentLine)) {
        this.skipToNextLine()
      }
    } else {
      this.col += this.currentLine.length
      this.currentLine = ''
    }
  }

  formatError(msg: string, row: number = this.row, col: number = this.col): string {
    return (
      msg +
      ' at (' +
      row +
      ', ' +
      col +
      ')\n\t' +
      this.lines[row - 1] +
      '\n\t' +
      ' '.repeat(col - 1) +
      '^'
    )
  }

  matchNumber(): boolean {
    return this.hasNext() && NUMBER_REGEX.test(this.currentLine)
  }

  eatNumber(): number {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a number'))
    }
    const match = NUMBER_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a number'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return parseFloat(match[0])
  }

  matchIdentifier(): boolean {
    return this.hasNext() && IDENTIFIER_REGEX.test(this.currentLine)
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

  eatDataType(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a datatype'))
    }
    const match = DATA_TYPE_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a datatype'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return match[0]
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

  eatCharacterLiteral(): number {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected a character literal'))
    }
    const match = CHARACTER_LITERAL_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a character literal'))
    }
    this.currentLine = this.currentLine.substring(match[0].length)
    this.col += match[0].length
    return Lexer.restoreEscapeChars(match[0]).charCodeAt(1)
  }

  private static restoreEscapeChars(original: string): string {
    let result = original
    for (const toReplace in ESCAPE_CHARACTERS) {
      result = result.replaceAll(toReplace, ESCAPE_CHARACTERS[toReplace])
    }
    return result
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
