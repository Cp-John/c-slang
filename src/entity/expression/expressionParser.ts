import { DataType, Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression, IncrementDecrement, Jump } from './expression'
import { FunctionCall } from './functionCall'
import { NumericLiteral } from './numericLiteral'

function assertAddressable(
  ele: string | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    typeof ele != 'string' ||
    !new Lexer(ele).matchIdentifier() ||
    env.lookupType(ele) == DataType.FUNCTION
  ) {
    throw new Error(lexer.formatError('expression is not addressable', row, col))
  }
}

function assertAssignable(
  ele: string | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    typeof ele != 'string' ||
    !new Lexer(ele).matchIdentifier() ||
    env.lookupType(ele) == DataType.FUNCTION
  ) {
    throw new Error(lexer.formatError('expression is not assignable', row, col))
  }
}

function checkBinaryOperand(
  ele: string | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (ele instanceof FunctionCall && ele.getReturnType(env) == 'void') {
    throw new Error(
      lexer.formatError("invalid operand type to binary expression: 'void'", row, col)
    )
  } else if (
    typeof ele == 'string' &&
    new Lexer(ele).matchIdentifier() &&
    env.lookupType(ele) == DataType.FUNCTION
  ) {
    throw new Error(
      lexer.formatError('invalid operand type to binary expression: function object', row, col)
    )
  }
}

function checkTernaryOperand(
  ele: string | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  try {
    checkBinaryOperand(ele, env, row, col, lexer)
  } catch (err) {
    throw new Error(err.message.replaceAll('binary', 'ternary'))
  }
}

function assertIsDeclared(identifier: string, env: Frame, row: number, col: number, lexer: Lexer) {
  if (!env.isDeclared(identifier)) {
    throw new Error(lexer.formatError("undeclared symbol: '" + identifier + "'", row, col))
  }
}

function assertIsFunction(identifier: string, env: Frame, row: number, col: number, lexer: Lexer) {
  if (env.lookupType(identifier) != DataType.FUNCTION) {
    throw new Error(lexer.formatError('called object type is not a function', row, col))
  }
}

export class ExpressionParser {
  private static parseActualParameterList(env: Frame, lexer: Lexer): Expression[] {
    const result = []
    lexer.eatDelimiter('(')
    if (!lexer.matchDelimiter(')')) {
      result.push(ExpressionParser.parse(env, lexer, true, false, false))
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push(ExpressionParser.parse(env, lexer, true, false, false))
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static recurParseNumericTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      result.push('!')
    } else if (lexer.matchDelimiter('&')) {
      const [row, col] = lexer.tell()
      lexer.eatDelimiter('&')
      this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      assertAddressable(result[result.length - 1], env, row, col, lexer)
      result.push('&')
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      if (lexer.matchDataType()) {
        const typeToCast = lexer.eatDataType()
        lexer.eatDelimiter(')')
        this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
        result.push(typeToCast)
      } else {
        this.recurParseExpression(env, lexer, result, true, isConstantExpression)
        lexer.eatDelimiter(')')
      }
    } else if (lexer.matchNumber()) {
      result.push(lexer.eatNumber())
    } else if (lexer.matchDelimiter("'")) {
      result.push(lexer.eatCharacterLiteral())
    } else if (lexer.matchIncrementDecrementOperator()) {
      if (isConstantExpression) {
        throw new Error(lexer.formatError('expected a constant expression'))
      }
      const [row, col] = lexer.tell()
      const opr =
        lexer.eatIncrementDecrementOperator() == '++'
          ? IncrementDecrement.PRE_INCREMENT
          : IncrementDecrement.PRE_DECREMENT
      this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    } else if (lexer.matchIdentifier()) {
      if (isConstantExpression) {
        throw new Error(lexer.formatError('expected a constant expression'))
      }
      const [row, col] = lexer.tell()
      const identifier = lexer.eatIdentifier()
      result.push(identifier)
      assertIsDeclared(identifier, env, row, col, lexer)
      if (lexer.matchDelimiter('(')) {
        assertIsFunction(identifier, env, row, col, lexer)
        const functionCall = new FunctionCall(
          env,
          row,
          col,
          lexer,
          String(result.pop()),
          this.parseActualParameterList(env, lexer)
        )
        if (!allowVoid && functionCall.getReturnType(env) == 'void') {
          throw new Error(
            lexer.formatError(
              "statement requires expression of scalar type ('void' invalid)",
              row,
              col
            )
          )
        }
        result.push(functionCall)
      }
    } else {
      throw new Error(lexer.formatError('expression expected'))
    }

    if (lexer.matchIncrementDecrementOperator()) {
      const [row, col] = lexer.tell()
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      result.push(
        lexer.eatIncrementDecrementOperator() == '++'
          ? IncrementDecrement.POST_INCREMENT
          : IncrementDecrement.POST_DECREMENT
      )
    }
  }

  private static recurParsePrioritizedNumericTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParseNumericTerm(env, lexer, result, allowVoid, isConstantExpression)
    while (lexer.matchPrioritizedArithmeticOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParseNumericalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParsePrioritizedNumericTerm(env, lexer, result, allowVoid, isConstantExpression)
    while (lexer.matchArithmeticOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParsePrioritizedNumericTerm(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedRelationalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ) {
    this.recurParseNumericalExpression(env, lexer, result, allowVoid, isConstantExpression)
    while (lexer.matchPrioritizedRelationalOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatRelationalOperator()
      this.recurParseNumericalExpression(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParseRelationalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParsePrioritizedRelationalTerm(env, lexer, result, allowVoid, isConstantExpression)
    while (lexer.matchRelationalOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatRelationalOperator()
      this.recurParsePrioritizedRelationalTerm(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedLogicalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParseRelationalExpression(env, lexer, result, allowVoid, isConstantExpression)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('&&')) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      jumps.push(new Jump(false))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('&&')
      this.recurParseRelationalExpression(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push('&&')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseLogicalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParsePrioritizedLogicalTerm(env, lexer, result, allowVoid, isConstantExpression)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('||')) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      jumps.push(new Jump(true))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('||')
      this.recurParsePrioritizedLogicalTerm(env, lexer, result, false, isConstantExpression)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push('||')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseTernaryExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParseLogicalExpression(env, lexer, result, allowVoid, isConstantExpression)
    if (!lexer.matchDelimiter('?')) {
      return
    }
    const [row, col] = lexer.tell()
    checkTernaryOperand(result[result.length - 1], env, row, col, lexer)
    lexer.eatDelimiter('?')
    const jumpToElse = new Jump(false)
    result.push(jumpToElse)
    this.recurParseLogicalExpression(env, lexer, result, false, isConstantExpression)
    const jumpToEnd = new Jump()
    result.push(jumpToEnd)
    lexer.eatDelimiter(':')
    jumpToElse.toPosition = result.length
    this.recurParseLogicalExpression(env, lexer, result, false, isConstantExpression)
    jumpToEnd.toPosition = result.length
  }

  private static recurParseExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): void {
    this.recurParseTernaryExpression(env, lexer, result, allowVoid, isConstantExpression)
    if (lexer.matchAssignmentOperator()) {
      const [row, col] = lexer.tell()
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatAssignmentOperator()
      this.recurParseExpression(env, lexer, result, false, isConstantExpression)
      result.push(opr)
    }
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowStringLiteral: boolean,
    allowVoid: boolean,
    isConstantExpression: boolean
  ): Expression {
    const result: (string | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[] = []
    if (lexer.matchDelimiter('"') && allowStringLiteral) {
      result.push(lexer.eatStringLiteral())
    } else {
      this.recurParseExpression(env, lexer, result, allowVoid, isConstantExpression)
    }
    return new Expression(result)
  }
}
