import { DataType, PointerType, PrimitiveType } from '../../interpreter/builtins'
import { Lexer, RELATIONAL_OPERATOR_RETEX } from '../../parser/lexer'

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
  const arithPrimitiveTypes = new Set<string>([
    PrimitiveType.CHAR,
    PrimitiveType.FLOAT,
    PrimitiveType.INT
  ])
  const wholePrimitiveTypes = new Set<string>([PrimitiveType.CHAR, PrimitiveType.INT])
  if (opr == '+' || opr == '-') {
    if (leftType instanceof PointerType) {
      if (!wholePrimitiveTypes.has(rightType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      }
    } else if (
      !arithPrimitiveTypes.has(leftType.toString()) ||
      !arithPrimitiveTypes.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return leftType instanceof PointerType
      ? leftType
      : getHigherPrecisionType(leftType, rightType as PrimitiveType)
  } else if (opr == '*' || opr == '/') {
    if (
      !arithPrimitiveTypes.has(leftType.toString()) ||
      !arithPrimitiveTypes.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else if (opr == '%') {
    if (
      !wholePrimitiveTypes.has(leftType.toString()) ||
      !wholePrimitiveTypes.has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else {
    const relOprMatch = RELATIONAL_OPERATOR_RETEX.exec(opr)
    if (opr == '&&' || opr == '||' || (relOprMatch && relOprMatch[0].length == opr.length)) {
      if (!(leftType instanceof PointerType) && !arithPrimitiveTypes.has(leftType.toString())) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      } else if (
        !(rightType instanceof PointerType) &&
        !arithPrimitiveTypes.has(rightType.toString())
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
