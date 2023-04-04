import { Lexer, RELATIONAL_OPERATOR_RETEX } from '../../parser/lexer'
import { ArrayType } from '../datatype/arrayType'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../datatype/primitiveType'

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


export function getHigherPrecisionType(leftType: DataType, rightType: DataType): DataType {
  if (leftType.isPointer()) {
    return leftType
  } else if (rightType.isPointer()) {
    return rightType
  } else if (leftType instanceof ArrayType) {
    return leftType
  } else if (rightType instanceof ArrayType) {
    return rightType
  } else if (leftType == PrimitiveTypes.float || rightType == PrimitiveTypes.float) {
    return PrimitiveTypes.float
  } else if (leftType == PrimitiveTypes.int || rightType == PrimitiveTypes.int) {
    return PrimitiveTypes.int
  } else if (leftType == PrimitiveTypes.char && rightType == PrimitiveTypes.char) {
    return PrimitiveTypes.char
  } else {
    throw new Error('impossible execution path')
  }
}

function checkImplicitConversion(
  row: number,
  col: number,
  lexer: Lexer,
  leftType: DataType,
  rightType: DataType
) {
  if (!leftType.canImplicitCastTo(rightType)) {
    throw new Error(
      lexer.formatError(
        "implicit conversion from '" + rightType + "' to '" + leftType + "'",
        row,
        col
      )
    )
  }
}

export function checkTypeCastType(
  oldType: DataType,
  typeToCast: PrimitiveType | PointerType,
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
  checkImplicitConversion(row, col, lexer, leftType, rightResultType)
  return leftType
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
    throw new Error(lexer.formatError("non-'void' type is required", row, col))
  }
}
