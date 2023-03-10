const NUMBER_REGEX = /^[+-]?([0-9]*[.])?[0-9]+/
const IDENTIFIER_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*/
const STRING_LITERAL_REGEX = /^".*?"/
const DATA_TYPE_REGEX = /^int|^char|^float/
const SPACE_REGEX = /^\s+/
const PRIORITIZED_OPERATOR_REGEX = /^[*\/%]/
const OPERATOR_REGEX = /^[*\/%\+-]/
const INCREMENT_DECREMENT_REGEX = /^\+\+|^--/
const RELATIONAL_OPERATOR_RETEX = /^>=|^<=|^>|^<|^==|^!=/
const PRIORITIZED_RELATIONAL_OPERATOR_REGEX = /^>=|^<=|^>|^</
const ASSIGNMENT_OPERATOR_REGEX = /^\+=|^-=|^\*=|^\/=|^%=|^=/

const RESERVED_KEYWORDS = new Set([
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
  'for'
])

export class Lexer {
  private lines: string[]
  private row: number
  private col: number
  private currentLine: string

  constructor(source: string) {
    this.lines = source.split(/\r?\n/)
    if (this.lines.length > 0) {
      this.currentLine = this.lines[0]
    }
    this.row = 1
    this.col = 1
  }

  private trimHead() {
    const spaces = SPACE_REGEX.exec(this.currentLine)
    if (spaces) {
      this.col += spaces[0].length
      this.currentLine = this.currentLine.substring(spaces[0].length)
    }
  }

  hasNext() {
    this.trimHead()
    while (this.row < this.lines.length && this.currentLine.length === 0) {
      this.currentLine = this.lines[this.row]
      this.row += 1
      this.col = 1
      this.trimHead()
    }
    return this.currentLine.length > 0
  }

  skipToNextLine() {
    if (this.row < this.lines.length) {
      this.currentLine = this.lines[this.row]
      this.row += 1
      this.col = 1
    } else {
      this.col += this.currentLine.length
      this.currentLine = ''
    }
  }

  private formatError(msg: string): string {
    return (
      'parsing error: ' +
      msg +
      ' at (' +
      this.row +
      ', ' +
      this.col +
      ')\n\t' +
      this.lines[this.row - 1] +
      '\n\t' +
      ' '.repeat(this.col - 1) +
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
    return this.hasNext() && this.currentLine.startsWith(keyword)
  }

  eatKeyword(keyword: string) {
    if (!this.hasNext() || !this.currentLine.startsWith(keyword)) {
      throw new Error(this.formatError('expected a keyword "' + keyword + '"'))
    }
    this.currentLine = this.currentLine.substring(keyword.length)
    this.col += keyword.length
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

  matchPrioritizedOperator(): boolean {
    return this.hasNext() && PRIORITIZED_OPERATOR_REGEX.test(this.currentLine)
  }

  matchOperator(): boolean {
    return this.hasNext() && OPERATOR_REGEX.test(this.currentLine)
  }

  eatOperator(): string {
    if (!this.hasNext()) {
      throw new Error(this.formatError('expected an operator'))
    }
    const match = OPERATOR_REGEX.exec(this.currentLine)
    if (!match) {
      throw new Error(this.formatError('expected a operator'))
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
    return match[0]
  }

  assertEndOfLine() {
    const currentRow = this.row
    if (this.hasNext() && this.row == currentRow) {
      throw new Error(this.formatError('expected a line break'))
    }
  }
}
