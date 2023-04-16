import { CProgramContext } from '../../interpreter/cProgramContext'
import { Frame } from '../../interpreter/frame'
import { Lexer } from '../../parser/lexer'
import { DataType } from '../datatype/dataType'
import { Statement } from './statement'

export abstract class TerminatingStatement extends Statement {
  override isTerminatingBlock(): boolean {
    return true
  }
}

export class Break extends TerminatingStatement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): Continue[] {
    if (!allowBreak) {
      throw new Error(lexer.formatError('break statement not in loop statement'))
    }
    lexer.eatKeyword('break')
    lexer.eatDelimiter(';')
    return [new Break()]
  }

  doExecute(env: Frame, context: CProgramContext): void {
    throw this
  }
}

export class Continue extends TerminatingStatement {
  static parse(
    env: Frame,
    lexer: Lexer,
    allowBreak: boolean,
    allowContinue: boolean,
    returnType: DataType | null
  ): [Continue] {
    if (!allowContinue) {
      throw new Error(lexer.formatError('continue statement not in loop statement'))
    }
    lexer.eatKeyword('continue')
    lexer.eatDelimiter(';')
    return [new Continue()]
  }

  doExecute(env: Frame, context: CProgramContext): void {
    throw this
  }
}
