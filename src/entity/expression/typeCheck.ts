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
  if (leftType == PrimitiveType.CHAR || rightType == PrimitiveType.INT) {
    return
  }
  if (getHigherPrecisionType(leftType, rightType).toString() != leftType.toString()) {
    throw new Error(
      lexer.formatError(
        "implicit conversion from '" + rightType + "' to '" + leftType + "'",
        row,
        col
      )
    )
  }
}

export function checkAssignmentOperandType(
  row: number,
  col: number,
  lexer: Lexer,
  leftType: DataType,
  rightType: DataType
): DataType {
  if (leftType.toString() == rightType.toString()) {
    return leftType
  } else if (leftType instanceof PointerType || rightType instanceof PointerType) {
    throw new Error(
      lexer.formatError("'" + rightType + "' cannot be assigned to '" + leftType + "'", row, col)
    )
  } else {
    checkImplicitConversion(row, col, lexer, leftType, rightType)
    return leftType
  }
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
    if (
      !(leftType instanceof PointerType) &&
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
        leftType.toString()
      )
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    } else if (
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
        rightType.toString()
      )
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return leftType instanceof PointerType
      ? leftType
      : getHigherPrecisionType(leftType, rightType as PrimitiveType)
  } else if (opr == '*' || opr == '/') {
    if (
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
        leftType.toString()
      ) ||
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
        rightType.toString()
      )
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else if (opr == '%') {
    if (
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.INT]).has(leftType.toString()) ||
      !new Set<string>([PrimitiveType.CHAR, PrimitiveType.INT]).has(rightType.toString())
    ) {
      invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
    }
    return getHigherPrecisionType(leftType as PrimitiveType, rightType as PrimitiveType)
  } else {
    const relOprMatch = RELATIONAL_OPERATOR_RETEX.exec(opr)
    if (opr == '&&' || opr == '||' || (relOprMatch && relOprMatch[0].length == opr.length)) {
      if (
        !(leftType instanceof PointerType) &&
        !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
          leftType.toString()
        )
      ) {
        invalidBinaryExprssionOperandType(row, col, lexer, leftType, rightType)
      } else if (
        !(rightType instanceof PointerType) &&
        !new Set<string>([PrimitiveType.CHAR, PrimitiveType.FLOAT, PrimitiveType.INT]).has(
          rightType.toString()
        )
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
