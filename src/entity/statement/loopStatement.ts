import { CProgramContext } from '../../interpreter/cProgramContext'
import { Statement } from './statement'

export abstract class LoopStatement extends Statement {
  static MAX_LOOP_COUNT: number = Math.pow(2, 20)
  private loopCounter: number

  resetLoopCounter() {
    this.loopCounter = 0
  }

  incrementLoopCounter(context: CProgramContext) {
    this.loopCounter++
    if (this.loopCounter >= LoopStatement.MAX_LOOP_COUNT) {
      context.currentLine = this.row
      throw new Error('maximum loop count exceeded.')
    }
  }
}
