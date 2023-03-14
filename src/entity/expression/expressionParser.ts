import { Frame, VariableType } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Function } from '../function/function'
import { Expression, IncrementDecrement, Jump } from './expression'
import { FunctionCall } from './functionCall'

function assertAddressable(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    typeof ele != 'string' ||
    !new Lexer(ele).matchIdentifier() ||
    env.lookupType(ele) == VariableType.FUNCTION
  ) {
    throw new Error(lexer.formatError('expression is not addressable', row, col))
  }
}

function assertAssignable(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    typeof ele != 'string' ||
    !new Lexer(ele).matchIdentifier() ||
    env.lookupType(ele) == VariableType.FUNCTION
  ) {
    throw new Error(lexer.formatError('expression is not assignable', row, col))
  }
}

function checkBinaryOperand(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
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
    env.lookupType(ele) == VariableType.FUNCTION
  ) {
    throw new Error(
      lexer.formatError('invalid operand type to binary expression: function object', row, col)
    )
  }
}

function checkTernaryOperand(
  ele: string | number | IncrementDecrement | FunctionCall | Jump,
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
    console.log(env)
    throw new Error(lexer.formatError("undeclared symbol: '" + identifier + "'", row, col))
  }
}

function assertIsFunction(identifier: string, env: Frame, row: number, col: number, lexer: Lexer) {
  if (env.lookupType(identifier) != VariableType.FUNCTION) {
    throw new Error(lexer.formatError('called object type is not a function', row, col))
  }
}

export class ExpressionParser {
  private static parseActualParameterList(env: Frame, lexer: Lexer): Expression[] {
    const result = []
    lexer.eatDelimiter('(')
    if (!lexer.matchDelimiter(')')) {
      result.push(ExpressionParser.parse(env, lexer))
    }
    while (!lexer.matchDelimiter(')')) {
      lexer.eatDelimiter(',')
      result.push(ExpressionParser.parse(env, lexer))
    }
    lexer.eatDelimiter(')')
    return result
  }

  private static recurParseNumericTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(env, lexer, result)
      result.push('!')
    } else if (lexer.matchDelimiter('&')) {
      const [row, col] = lexer.tell()
      lexer.eatDelimiter('&')
      this.recurParseNumericTerm(env, lexer, result)
      assertAddressable(result[result.length - 1], env, row, col, lexer)
      result.push('&')
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      this.recurParseExpression(env, lexer, result)
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
      this.recurParseNumericTerm(env, lexer, result)
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    } else {
      const [row, col] = lexer.tell()
      const identifier = lexer.eatIdentifier()
      result.push(identifier)
      assertIsDeclared(identifier, env, row, col, lexer)
      if (lexer.matchDelimiter('(')) {
        assertIsFunction(identifier, env, row, col, lexer)
        result.push(
          new FunctionCall(
            env,
            row,
            col,
            lexer,
            String(result.pop()),
            this.parseActualParameterList(env, lexer)
          )
        )
      }
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
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseNumericTerm(env, lexer, result)
    while (lexer.matchPrioritizedArithmeticOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParseNumericTerm(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParseNumericalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedNumericTerm(env, lexer, result)
    while (lexer.matchArithmeticOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatArithmeticOperator()
      this.recurParsePrioritizedNumericTerm(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedRelationalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ) {
    this.recurParseNumericalExpression(env, lexer, result)
    while (lexer.matchPrioritizedRelationalOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatRelationalOperator()
      this.recurParseNumericalExpression(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParseRelationalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedRelationalTerm(env, lexer, result)
    while (lexer.matchRelationalOperator()) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatRelationalOperator()
      this.recurParsePrioritizedRelationalTerm(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push(opr)
    }
  }

  private static recurParsePrioritizedLogicalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseRelationalExpression(env, lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('&&')) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      jumps.push(new Jump(false))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('&&')
      this.recurParseRelationalExpression(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push('&&')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseLogicalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParsePrioritizedLogicalTerm(env, lexer, result)
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('||')) {
      const [row, col] = lexer.tell()
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      jumps.push(new Jump(true))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('||')
      this.recurParsePrioritizedLogicalTerm(env, lexer, result)
      checkBinaryOperand(result[result.length - 1], env, row, col, lexer)
      result.push('||')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
  }

  private static recurParseTernaryExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseLogicalExpression(env, lexer, result)
    if (!lexer.matchDelimiter('?')) {
      return
    }
    const [row, col] = lexer.tell()
    checkTernaryOperand(result[result.length - 1], env, row, col, lexer)
    lexer.eatDelimiter('?')
    const jumpToElse = new Jump(false)
    result.push(jumpToElse)
    this.recurParseLogicalExpression(env, lexer, result)
    const jumpToEnd = new Jump()
    result.push(jumpToEnd)
    lexer.eatDelimiter(':')
    jumpToElse.toPosition = result.length
    this.recurParseLogicalExpression(env, lexer, result)
    jumpToEnd.toPosition = result.length
  }

  private static recurParseExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | number | IncrementDecrement | FunctionCall | Jump)[]
  ): void {
    this.recurParseTernaryExpression(env, lexer, result)
    if (lexer.matchAssignmentOperator()) {
      const [row, col] = lexer.tell()
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatAssignmentOperator()
      this.recurParseExpression(env, lexer, result)
      result.push(opr)
    }
  }

  static parse(env: Frame, lexer: Lexer): Expression {
    const result: (string | number | IncrementDecrement | FunctionCall | Jump)[] = []
    this.recurParseExpression(env, lexer, result)
    return new Expression(result)
  }
}
