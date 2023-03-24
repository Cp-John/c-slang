import {
  ARITH_PRIMITIVE_TYPES,
  DataType,
  PointerType,
  PrimitiveType,
  WHOLE_PRIMITIVE_TYPES
} from '../../interpreter/builtins'
import { Lexer, RELATIONAL_OPERATOR_RETEX } from '../../parser/lexer'

export function assertSubscritable(type: DataType, lexer: Lexer) {
  if (type instanceof PointerType) {
    return
  }
  throw new Error(lexer.formatError('subscripted value is not an array, pointer'))
}

export function checkSubscriptType(type: DataType, row: number, col: number, lexer: Lexer) {
  if (!WHOLE_PRIMITIVE_TYPES.has(type.toString())) {
    throw new Error(lexer.formatError('array subscript is not an integer', row, col))
  }
}

export function checkUnaryMinusOperandType(type: DataType, row: number, col: number, lexer: Lexer) {
  if (type instanceof PointerType) {
    throw new Error(lexer.formatError("invalid argument type '" + type.toString() + "' to unary expression", row, col))
  }
}

function invalidBinaryExprssionOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  leftType: DataType,
  rightType: DataType
) {
  throw new Error(
    lexer.formatError(
      "invalid operand type to binary expression ('" + leftType + "' and '" + rightType + "')",
      row,
      col
    )
  )
}

export function getHigherPrecisionType(leftType: DataType, rightType: DataType): DataType {
  if (leftType instanceof PointerType || rightType instanceof PointerType) {
    return leftType
  } else if (leftType == PrimitiveType.FLOAT || rightType == PrimitiveType.FLOAT) {
    return PrimitiveType.FLOAT
  } else if (leftType == PrimitiveType.INT || rightType == PrimitiveType.INT) {
    return PrimitiveType.INT
  } else if (leftType == PrimitiveType.CHAR && rightType == PrimitiveType.CHAR) {
    return PrimitiveType.CHAR
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
  if (leftType.toString() == rightType.toString()) {
    return
  }
  if (leftType == PrimitiveType.CHAR && rightType == PrimitiveType.INT) {
    return
  }
  if (
    leftType instanceof PointerType &&
    rightType instanceof PointerType &&
    (leftType.dereference() == PrimitiveType.VOID || rightType.dereference() == PrimitiveType.VOID)
  ) {
    return
  }
  const error = new Error(
    lexer.formatError(
      "implicit conversion from '" + rightType + "' to '" + leftType + "'",
      row,
      col
    )
  )
  if (leftType instanceof PointerType || rightType instanceof PointerType) {
    throw error
  }
  if (getHigherPrecisionType(leftType, rightType).toString() != leftType.toString()) {
    throw error
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
  if (opr == '+' || opr == '-') {
    if (leftType instanceof PointerType) {
      if (!WHOLE_PRIMITIVE_TYPES.has(rightType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
    } else if (opr == '+' && rightType instanceof PointerType) {
      if (!WHOLE_PRIMITIVE_TYPES.has(leftType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
    } else if (
      !ARITH_PRIMITIVE_TYPES.has(leftType.toString()) ||
      !ARITH_PRIMITIVE_TYPES.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return leftType instanceof PointerType
      ? leftType
      : getHigherPrecisionType(leftType, rightType as PrimitiveType)
  } else if (opr == '*' || opr == '/') {
    if (
      !ARITH_PRIMITIVE_TYPES.has(leftType.toString()) ||
      !ARITH_PRIMITIVE_TYPES.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else if (opr == '%') {
    if (
      !WHOLE_PRIMITIVE_TYPES.has(leftType.toString()) ||
      !WHOLE_PRIMITIVE_TYPES.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else {
    const relOprMatch = RELATIONAL_OPERATOR_RETEX.exec(opr)
    if (opr == '&&' || opr == '||' || (relOprMatch && relOprMatch[0].length == opr.length)) {
      if (!(leftType instanceof PointerType) && !ARITH_PRIMITIVE_TYPES.has(leftType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      } else if (
        !(rightType instanceof PointerType) &&
        !ARITH_PRIMITIVE_TYPES.has(rightType.toString())
      ) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
      return PrimitiveType.INT
    } else {
      throw new Error('impossible execution path')
    }
  }
}

export function checkConditionOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  conditionType: DataType
) {
  if (conditionType == PrimitiveType.VOID) {
    throw new Error(lexer.formatError("non-'void' type is required", row, col))
  }
}
