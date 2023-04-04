import { Lexer } from '../../parser/lexer'
import { DataType } from '../datatype/dataType'

export function assertSubscriptable(type: DataType, lexer: Lexer) {
  if (!type.isSubscriptable()) {
    throw new Error(lexer.formatError('subscripted value is not an array, pointer'))
  }
}

export function checkSubscriptType(type: DataType, row: number, col: number, lexer: Lexer) {
  if (!type.isWholePrimitiveType()) {
    throw new Error(lexer.formatError('array subscript is not an integer', row, col))
  }
}

export function checkUnaryMinusOperandType(type: DataType, row: number, col: number, lexer: Lexer) {
  if (type.isPointer()) {
    throw new Error(
      lexer.formatError(
        "invalid argument type '" + type.toString() + "' to unary expression",
        row,
        col
      )
    )
  }
}

export function checkTernaryOperandType(
  firstType: DataType,
  secondType: DataType,
  row: number,
  col: number,
  lexer: Lexer
): DataType {
  if (firstType.canImplicitCastTo(secondType)) {
    return secondType
  } else if (secondType.canImplicitCastTo(firstType)) {
    return firstType
  } else {
    throw new Error(
      lexer.formatError(
        "type mismatch in conditional expression ('" +
          firstType.toString() +
          "' and '" +
          secondType.toString() +
          "')",
        row,
        col
      )
    )
  }
}

export function checkTypeCastType(
  oldType: DataType,
  typeToCast: DataType,
  oldTypeRow: number,
  oldTypeCol: number,
  lexer: Lexer
): void {
  if (!oldType.canExplicitCastTo(typeToCast)) {
    throw new Error(
      lexer.formatError(
        "cannot cast type '" + oldType.toString() + "' to '" + typeToCast.toString() + "'",
        oldTypeRow,
        oldTypeCol
      )
    )
  }
}

export function checkAssignmentOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  leftType: DataType,
  assignOpr: string,
  rightType: DataType
): DataType {
  let rightResultType = rightType
  if (assignOpr != '=') {
    rightResultType = checkBinaryExprssionOperandType(
      row,
      col,
      lexer,
      leftType,
      assignOpr.replace('=', ''),
      rightType
    )
  }
  if (rightResultType.canImplicitCastTo(leftType)) {
    return leftType
  }
  let errMsg
  if (rightResultType.canExplicitCastTo(leftType)) {
    errMsg = "implicit conversion from '" + rightResultType + "' to '" + leftType + "'"
  } else {
    errMsg =
      "assigning to '" +
      leftType.toString() +
      "' from incompatible type '" +
      rightResultType.toString() +
      "'"
  }
  throw new Error(lexer.formatError(errMsg, row, col))
}

export function checkBinaryExprssionOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  leftType: DataType,
  opr: string,
  rightType: DataType
): DataType {
  const resultType = leftType.applyBinaryOperator(opr, rightType)
  if (resultType == undefined) {
    throw new Error(
      lexer.formatError(
        "invalid operand type to binary expression ('" + leftType + "' and '" + rightType + "')",
        row,
        col
      )
    )
  }
  return resultType
}

export function checkConditionOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  conditionType: DataType
) {
  if (!conditionType.isArithPrimitiveType()) {
    throw new Error(
      lexer.formatError(
        "expected an arithmetic primitive type ('char', 'int', and 'float') for conditional expression, but got '" +
          conditionType +
          "'",
        row,
        col
      )
    )
  }
}
