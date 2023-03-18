import { DataType, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { Expression, IncrementDecrement, Jump } from './expression'
import { FunctionCall } from './functionCall'
import { NumericLiteral } from './numericLiteral'
import {
  checkAssignmentOperandType,
  checkBinaryExprssionOperandType,
  checkConditionOperandType,
  getHigherPrecisionType
} from './typeCheck'

function assertAddressable(
  ele: string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    typeof ele != 'string' ||
    !new Lexer(ele).matchIdentifier() ||
    env.lookupType(ele) == PrimitiveType.FUNCTION
  ) {
    throw new Error(lexer.formatError('expression is not addressable', row, col))
  }
}

export const DEREFERENCE_TAG = '$DEREFERENCE'

function assertAssignable(
  ele: string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump,
  env: Frame,
  row: number,
  col: number,
  lexer: Lexer
) {
  if (
    ele != DEREFERENCE_TAG &&
    (typeof ele != 'string' ||
      !new Lexer(ele).matchIdentifier() ||
      env.lookupType(ele) == PrimitiveType.FUNCTION)
  ) {
    throw new Error(lexer.formatError('expression is not assignable', row, col))
  }
}

function assertIsDeclared(identifier: string, env: Frame, row: number, col: number, lexer: Lexer) {
  if (!env.isDeclared(identifier)) {
    throw new Error(lexer.formatError("undeclared symbol: '" + identifier + "'", row, col))
  }
}

function assertIsFunction(identifier: string, env: Frame, row: number, col: number, lexer: Lexer) {
  if (env.lookupType(identifier) != PrimitiveType.FUNCTION) {
    throw new Error(lexer.formatError('called object type is not a function', row, col))
  }
}

export class ExpressionParser {
  private static recurParseNumericTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let dataType: DataType
    if (lexer.matchDelimiter('!')) {
      lexer.eatDelimiter('!')
      this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      result.push('!')
      dataType = PrimitiveType.INT
    } else if (lexer.matchDelimiter('&')) {
      const [row, col] = lexer.tell()
      lexer.eatDelimiter('&')
      const type = this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      assertAddressable(result[result.length - 1], env, row, col, lexer)
      result.push('&')
      dataType = new PointerType(type)
    } else if (lexer.matchDelimiter('*')) {
      const [row, col] = lexer.tell()
      lexer.eatDelimiter('*')
      const type = this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      if (!(type instanceof PointerType)) {
        throw new Error(
          lexer.formatError(
            "indirection requires pointer operand, ('" + type + "' invalid)",
            row,
            col
          )
        )
      }
      result.push(DEREFERENCE_TAG)
      dataType = type.dereference()
    } else if (lexer.matchDelimiter('(')) {
      lexer.eatDelimiter('(')
      if (lexer.matchDataType()) {
        const [row, col] = lexer.tell()
        const typeToCast = lexer.eatDataType()
        if (typeToCast == PrimitiveType.VOID && !allowVoid) {
          throw new Error(
            lexer.formatError(
              "statement requires expression of scalar type ('void' invalid)",
              row,
              col
            )
          )
        }
        lexer.eatDelimiter(')')
        this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
        result.push(typeToCast)
        dataType = typeToCast
      } else {
        dataType = this.recurParseExpression(env, lexer, result, true, isConstantExpression)
        lexer.eatDelimiter(')')
      }
    } else if (lexer.matchNumber()) {
      const numeric = lexer.eatNumber()
      result.push(numeric)
      dataType = numeric.getDataType()
    } else if (lexer.matchDelimiter("'")) {
      result.push(lexer.eatCharacterLiteral())
      dataType = PrimitiveType.CHAR
    } else if (lexer.matchDelimiter('"')) {
      result.push(lexer.eatStringLiteral())
      dataType = new PointerType(PrimitiveType.CHAR)
    } else if (lexer.matchIncrementDecrementOperator()) {
      if (isConstantExpression) {
        throw new Error(lexer.formatError('expected a constant expression'))
      }
      const [row, col] = lexer.tell()
      const opr =
        lexer.eatIncrementDecrementOperator() == '++'
          ? IncrementDecrement.PRE_INCREMENT
          : IncrementDecrement.PRE_DECREMENT
      dataType = this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
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
      if (!lexer.matchDelimiter('(')) {
        dataType = env.lookupType(identifier)
      } else {
        assertIsFunction(identifier, env, row, col, lexer)
        const functionName = String(result.pop())
        const functionCall = new FunctionCall(
          env,
          functionName,
          env.lookupFunction(functionName).parseActualParameters(env, lexer)
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
        dataType = functionCall.getReturnType(env)
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
    return dataType
  }

  private static recurParsePrioritizedNumericTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParseNumericTerm(env, lexer, result, allowVoid, isConstantExpression)
    while (lexer.matchPrioritizedArithmeticOperator()) {
      const [row, col] = lexer.tell()
      const opr = lexer.eatArithmeticOperator()
      const rightType = this.recurParseNumericTerm(env, lexer, result, false, isConstantExpression)
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, opr, rightType)
      result.push(opr)
    }
    return leftType
  }

  private static recurParseNumericalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParsePrioritizedNumericTerm(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    while (lexer.matchArithmeticOperator()) {
      const [row, col] = lexer.tell()
      const opr = lexer.eatArithmeticOperator()
      const rightType = this.recurParsePrioritizedNumericTerm(
        env,
        lexer,
        result,
        false,
        isConstantExpression
      )
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, opr, rightType)
      result.push(opr)
    }
    return leftType
  }

  private static recurParsePrioritizedRelationalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParseNumericalExpression(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    while (lexer.matchPrioritizedRelationalOperator()) {
      const [row, col] = lexer.tell()
      const opr = lexer.eatRelationalOperator()
      const rightType = this.recurParseNumericalExpression(
        env,
        lexer,
        result,
        false,
        isConstantExpression
      )
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, opr, rightType)
      result.push(opr)
    }
    return leftType
  }

  private static recurParseRelationalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParsePrioritizedRelationalTerm(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    while (lexer.matchRelationalOperator()) {
      const [row, col] = lexer.tell()
      const opr = lexer.eatRelationalOperator()
      const rightType = this.recurParsePrioritizedRelationalTerm(
        env,
        lexer,
        result,
        false,
        isConstantExpression
      )
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, opr, rightType)
      result.push(opr)
    }
    return leftType
  }

  private static recurParsePrioritizedLogicalTerm(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParseRelationalExpression(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('&&')) {
      const [row, col] = lexer.tell()
      jumps.push(new Jump(false))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('&&')
      const rightType = this.recurParseRelationalExpression(
        env,
        lexer,
        result,
        false,
        isConstantExpression
      )
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, '&&', rightType)
      result.push('&&')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
    return leftType
  }

  private static recurParseLogicalExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParsePrioritizedLogicalTerm(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    const jumps: Jump[] = []
    while (lexer.matchDelimiter('||')) {
      const [row, col] = lexer.tell()
      jumps.push(new Jump(true))
      result.push(jumps[jumps.length - 1])
      lexer.eatDelimiter('||')
      const rightType = this.recurParsePrioritizedLogicalTerm(
        env,
        lexer,
        result,
        false,
        isConstantExpression
      )
      leftType = checkBinaryExprssionOperandType(row, col, lexer, leftType, '||', rightType)
      result.push('||')
    }
    jumps.forEach(jump => (jump.toPosition = result.length))
    return leftType
  }

  private static recurParseTernaryExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    const conditionType = this.recurParseLogicalExpression(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    if (!lexer.matchDelimiter('?')) {
      return conditionType
    }
    const [row, col] = lexer.tell()
    checkConditionOperandType(row, col, lexer, conditionType)
    lexer.eatDelimiter('?')
    const jumpToElse = new Jump(false)
    result.push(jumpToElse)
    const firstType = this.recurParseLogicalExpression(
      env,
      lexer,
      result,
      false,
      isConstantExpression
    )
    const jumpToEnd = new Jump()
    result.push(jumpToEnd)
    lexer.eatDelimiter(':')
    jumpToElse.toPosition = result.length
    const secondType = this.recurParseLogicalExpression(
      env,
      lexer,
      result,
      false,
      isConstantExpression
    )
    jumpToEnd.toPosition = result.length
    return getHigherPrecisionType(firstType, secondType)
  }

  private static recurParseExpression(
    env: Frame,
    lexer: Lexer,
    result: (string | DataType | NumericLiteral | IncrementDecrement | FunctionCall | Jump)[],
    allowVoid: boolean,
    isConstantExpression: boolean
  ): DataType {
    let leftType = this.recurParseTernaryExpression(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    if (lexer.matchAssignmentOperator()) {
      const [row, col] = lexer.tell()
      assertAssignable(result[result.length - 1], env, row, col, lexer)
      const opr = lexer.eatAssignmentOperator()
      const rightType = this.recurParseExpression(env, lexer, result, false, isConstantExpression)
      leftType = checkAssignmentOperandType(row, col, lexer, leftType, opr, rightType)
      result.push(opr)
    }
    return leftType
  }

  static parse(
    env: Frame,
    lexer: Lexer,
    allowVoid: boolean,
    isConstantExpression: boolean,
    expectedDataType: DataType | null
  ): Expression {
    const result: (
      | string
      | DataType
      | NumericLiteral
      | IncrementDecrement
      | FunctionCall
      | Jump
    )[] = []
    const [row, col] = lexer.tell()
    const actualType = this.recurParseExpression(
      env,
      lexer,
      result,
      allowVoid,
      isConstantExpression
    )
    if (expectedDataType != null) {
      checkAssignmentOperandType(row, col, lexer, expectedDataType, '=', actualType)
    }
    return new Expression(result, actualType)
  }
}
