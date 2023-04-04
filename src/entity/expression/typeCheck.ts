import { ARITH_PRIMITIVE_TYPES, WHOLE_PRIMITIVE_TYPES } from '../../interpreter/builtins'
import { Lexer, RELATIONAL_OPERATOR_RETEX } from '../../parser/lexer'
import { ArrayType } from '../datatype/arrayType'
import { DataType } from '../datatype/dataType'
import { PointerType } from '../datatype/pointerType'
import { PrimitiveType, PrimitiveTypes } from '../datatype/primitiveType'

export function assertSubscritable(type: DataType, lexer: Lexer) {
  if (type instanceof PointerType || type instanceof ArrayType) {
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
    throw new Error(
      lexer.formatError(
        "invalid argument type '" + type.toString() + "' to unary expression",
        row,
        col
      )
    )
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
  if (leftType instanceof PointerType) {
    return leftType
  } else if (rightType instanceof PointerType) {
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
  if (leftType.toString() == rightType.toString()) {
    return
  }
  if (leftType == PrimitiveTypes.char && rightType == PrimitiveTypes.int) {
    return
  }
  if (
    leftType instanceof PointerType &&
    rightType instanceof PointerType &&
    (leftType.dereference() == PrimitiveTypes.void ||
      rightType.dereference() == PrimitiveTypes.void)
  ) {
    return
  }
  if (rightType instanceof ArrayType && rightType.canImplicitCastTo(leftType)) {
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

export function checkTypeCastType(
  oldType: DataType,
  typeToCast: PrimitiveType | PointerType,
  oldTypeRow: number,
  oldTypeCol: number,
  lexer: Lexer
): void {
  if (oldType.toString() == typeToCast.toString()) {
    return
  }
  if (
    oldType instanceof ArrayType &&
    typeToCast instanceof PointerType &&
    oldType.toPointerType().toString() == typeToCast.toString()
  ) {
    return
  }
  if (oldType == PrimitiveTypes.void || oldType instanceof ArrayType) {
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
  if (opr == '+' || opr == '-') {
    if (leftType instanceof PointerType || leftType instanceof ArrayType) {
      if (opr == '-' && leftType.toString() == rightType.toString()) {
        return PrimitiveTypes.int
      } else if (!WHOLE_PRIMITIVE_TYPES.has(rightType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
    } else if (opr == '+' && (rightType instanceof PointerType || rightType instanceof ArrayType)) {
      if (!WHOLE_PRIMITIVE_TYPES.has(leftType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
    } else if (
      !ARITH_PRIMITIVE_TYPES.has(leftType.toString()) ||
      !ARITH_PRIMITIVE_TYPES.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    const resultType = getHigherPrecisionType(leftType, rightType)
    return resultType instanceof ArrayType ? resultType.toPointerType() : resultType
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
      return PrimitiveTypes.int
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
  if (conditionType == PrimitiveTypes.void) {
    throw new Error(lexer.formatError("non-'void' type is required", row, col))
  }
}
