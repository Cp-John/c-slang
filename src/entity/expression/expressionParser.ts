import { Lexer } from '../../parser/lexer'
import { Expression, IncrementDecrement, Jump } from './expression'
import { FunctionCall } from './functionCall'

function assertAddressable(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (typeof ele != 'string' || !new Lexer(ele).matchIdentifier()) {
    throw new Error(lexer.formatError('expression is not addressable', row, col))
  }
}

function assertAssignable(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (typeof ele != 'string' || !new Lexer(ele).matchIdentifier()) {
    throw new Error(lexer.formatError('expression is not assignable', row, col))
  }
}

function assertNotVoid(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (ele instanceof FunctionCall) {
    throw new Error(
      lexer.formatError("invalid operands to binary expression ('void' and 'number')", row, col)
    )
  }
}

export class ExpressionParser {
  private static parseActualParameterList(lexer: Lexer): Expression[] {
    const result = []
    lexer.eatDelimiter('(')
    if (!lexer.matchDelimiter(')')) {
      result.push(ExpressionParser.parse(lexer))
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push(ExpressionParser.parse(lexer))
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static recurParseNumericTerm(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(lexer, result)
      result.push('!')
    } else if (lexer.matchDelimiter('&')) {
      const [row, col] = lexer.tell()
      lexer.eatDelimiter('&')
      this.recurParseNumericTerm(lexer, result)
      assertAddressable(result[result.length - 1], row, col, lexer)
      result.push('&')
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      this.recurParseExpression(lexer, result)
      lexer.eatDelimiter(')')
    } else if (lexer.matchNumber()) {
      result.push(lexer.eatNumber())
    } else if (lexer.matchDelimiter("'")) {
      result.push(lexer.eatCharacterLiteral())
    } else if (lexer.matchDelimiter('"')) {
      result.push(lexer.eatStringLiteral())
    } else if (lexer.matchIncrementDecrementOperator()) {
      const [row, col] = lexer.tell()
      const opr =
        lexer.eatIncrementDecrementOperator() == '++'
          ? IncrementDecrement.PRE_INCREMENT
          : IncrementDecrement.PRE_DECREMENT
      this.recurParseNumericTerm(lexer, result)
      assertAssignable(result[result.length - 1], row, col, lexer)
      result.push(opr)
    } else {
      result.push(lexer.eatIdentifier())
      if (lexer.matchDelimiter('(')) {
        result.push(new FunctionCall(String(result.pop()), this.parseActualParameterList(lexer)))
      }
    }

    if (lexer.matchIncrementDecrementOperator()) {
      result.push(
        lexer.eatIncrementDecrementOperator() == '++'
          ? IncrementDecrement.POST_INCREMENT
          : IncrementDecrement.POST_DECREMENT
      )
    }
  }

  private static recurParsePrioritizedNumericTerm(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseNumericTerm(lexer, result)
    while (lexer.matchPrioritizedArithmeticOperator()) {
      const [row, col] = lexer.tell()
      assertNotVoid(result[result.length - 1], row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParseNumericTerm(lexer, result)
      assertNotVoid(result[result.length - 1], row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParseNumericalExpression(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedNumericTerm(lexer, result)
    while (lexer.matchArithmeticOperator()) {
      const [row, col] = lexer.tell()
      assertNotVoid(result[result.length - 1], row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParsePrioritizedNumericTerm(lexer, result)
      assertNotVoid(result[result.length - 1], row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedRelationalTerm(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ) {
    this.recurParseNumericalExpression(lexer, result)
    while (lexer.matchPrioritizedRelationalOperator()) {
      const opr = lexer.eatRelationalOperator()
      this.recurParseNumericalExpression(lexer, result)
      result.push(opr)
    }
  }

  private static recurParseRelationalExpression(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedRelationalTerm(lexer, result)
    while (lexer.matchRelationalOperator()) {
      const opr = lexer.eatRelationalOperator()
      this.recurParsePrioritizedRelationalTerm(lexer, result)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedLogicalTerm(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseRelationalExpression(lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('&&')) {
      jumps.push(new Jump(false))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('&&')
      this.recurParseRelationalExpression(lexer, result)
      result.push('&&')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseLogicalExpression(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedLogicalTerm(lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('||')) {
      jumps.push(new Jump(true))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('||')
      this.recurParsePrioritizedLogicalTerm(lexer, result)
      result.push('||')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseTernaryExpression(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseLogicalExpression(lexer, result)
    if (!lexer.matchDelimiter('?')) {
      return
    }
    lexer.eatDelimiter('?')
    const jumpToElse = new Jump(false)
    result.push(jumpToElse)
    this.recurParseLogicalExpression(lexer, result)
    const jumpToEnd = new Jump()
    result.push(jumpToEnd)
    lexer.eatDelimiter(':')
    jumpToElse.toPosition = result.length
    this.recurParseLogicalExpression(lexer, result)
    jumpToEnd.toPosition = result.length
  }

  private static recurParseExpression(
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseTernaryExpression(lexer, result)
    if (lexer.matchAssignmentOperator()) {
      const [row, col] = lexer.tell()
      assertAssignable(result[result.length - 1], row, col, lexer)
      const opr = lexer.eatAssignmentOperator()
      this.recurParseExpression(lexer, result)
      result.push(opr)
    }
  }

  static parse(lexer: Lexer): Expression {
    const result: (string | number | IncrementDecrement | FunctionCall | Jump)[] = []
    this.recurParseExpression(lexer, result)
    return new Expression(result)
  }
}
