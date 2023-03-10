const NUMBER_REGEX = /^[+-]?([0-9]*[.])?[0-9]+/;
const IDENTIFIER_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]/;
const STRING_LITERAL_REGEX = /^".*?"/;
const DATA_TYPE_REGEX = /^int|^char|^float/
const SPACE_REGEX = /^\s*/
const PRIORITIZED_OPERATOR_REGEX = /^[*\/%]/
const OPERATOR_REGEX = /^[*\/%\+-]/

const RESERVED_KEYWORDS = new Set(['int', 'char', 'float',
                                'break', 'continue', 'return',
                                'if', 'else', 'while', 'do', 'for'])

export class Lexer {
    private lines: string[];
    private row: number;
    private col: number;
    private currentLine: string;

    constructor(source:string) {
        this.lines = source.split(/\r?\n/);
        if (this.lines.length > 0) {
            this.currentLine = this.lines[0]
        }
        this.row = 1;
        this.col = 1;
    }

    private trimHead() {
        const spaces = this.currentLine.match(SPACE_REGEX)
        if (spaces) {
            this.col += spaces[0].length;
            this.currentLine = this.currentLine.substring(spaces.length);
        }
    }
    
    hasNext() {
        this.trimHead();
        while (this.row < this.lines.length && this.currentLine.length === 0) {
            this.currentLine = this.lines[this.row]
            this.row += 1;
            this.trimHead();
        }
        return this.currentLine.length > 0;
    }

    private formatError(msg: string): string {
        return 'parsing error: ' + msg + ' at (' + this.row + ', ' + this.col + ')';
    }

    matchNumber(): boolean {
        return this.hasNext() && this.currentLine.match(NUMBER_REGEX) != null;
    }
    
    eatNumber(): number {
        if (!this.hasNext()) {
            throw new Error(this.formatError('expected a number'));
        }
        const match = this.currentLine.match(NUMBER_REGEX);
        if (!match) {
            throw new Error(this.formatError('expected a number'));
        }
        this.currentLine = this.currentLine.substring(match[0].length)
        this.col += match[0].length;
        return parseFloat(match[0]);
    }

    eatIdentifier(): string {
        if (!this.hasNext()) {
            throw new Error(this.formatError('expected an identifier'));
        }
        const match = this.currentLine.match(IDENTIFIER_REGEX);
        if (!match) {
            throw new Error(this.formatError('expected an identifier'));
        } else if (RESERVED_KEYWORDS.has(match[0])) {
            throw new Error(this.formatError(match[0] + ' is a reserved keyword'))
        }
        this.currentLine = this.currentLine.substring(match[0].length)
        this.col += match[0].length;
        return match[0];
    }

    matchKeyword(keyword: string): boolean {
        return this.hasNext() && this.currentLine.startsWith(keyword);
    }

    eatKeyword(keyword: string) {
        if (!this.hasNext() || !this.currentLine.startsWith(keyword)) {
            throw new Error(this.formatError('expected a keyword \"' + keyword + '\"'));
        }
        this.currentLine = this.currentLine.substring(keyword.length)
        this.col += keyword.length
    }

    matchDelimiter(delim: string) {
        return this.hasNext() && this.currentLine.startsWith(delim);
    }

    eatDelimiter(delim: string) {
        if (!this.hasNext() || !this.currentLine.startsWith(delim)) {
            throw new Error(this.formatError('expected a delimiter \"' + delim + '\"'));
        }
        this.currentLine = this.currentLine.substring(delim.length)
        this.col += delim.length
    }

    matchDataType(): boolean {
        return this.hasNext() && this.currentLine.match(DATA_TYPE_REGEX) != null;
    }

    eatDataType(): string {
        if (!this.hasNext()) {
            throw new Error(this.formatError('expected a datatype'));
        }
        const match = this.currentLine.match(DATA_TYPE_REGEX);
        if (!match) {
            throw new Error(this.formatError('expected a datatype'));
        }
        this.currentLine = this.currentLine.substring(match[0].length)
        this.col += match[0].length;
        return match[0];
    }

    matchPrioritizedOperator(): boolean {
        return this.hasNext() && this.currentLine.match(PRIORITIZED_OPERATOR_REGEX) != null;
    }

    matchOperator(): boolean {
        return this.hasNext() && this.currentLine.match(OPERATOR_REGEX) != null;
    }

    eatOperator(): string {
        if (!this.hasNext()) {
            throw new Error(this.formatError('expected an operator'));
        }
        const match = this.currentLine.match(OPERATOR_REGEX);
        if (!match) {
            throw new Error(this.formatError('expected a operator'));
        }
        this.currentLine = this.currentLine.substring(match[0].length)
        this.col += match[0].length;
        return match[0];
    }

    assertEndOfLine() {
        const currentRow = this.row;
        if (this.hasNext() && this.row == currentRow) {
            throw new Error(this.formatError('expected a line break'))
        }
    }
}