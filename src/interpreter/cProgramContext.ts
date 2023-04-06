import { Frame } from './frame'

export class CProgramContext {
  private stdout: string
  private baseFrame: Frame
  private currentLineNum: number
  private maxExecutionTimeMs: number
  private expireTimeMs: number
  private executedStatementCount: number

  constructor(maxExecTimMs: number = 1000) {
    this.stdout = ''
    this.baseFrame = Frame.extend(Frame.getBuiltinFrame())
    this.maxExecutionTimeMs = Math.max(maxExecTimMs, 1000)
    this.currentLineNum = 0
    this.expireTimeMs = new Date().getTime() + maxExecTimMs
    this.executedStatementCount = 0
  }

  incrementExecutedStatementCount() {
    this.executedStatementCount++
  }

  setCurrentLineNum(currentLineNum: number) {
    this.currentLineNum = currentLineNum
  }

  getCurrentLineNum() {
    return this.currentLineNum
  }

  getStdout() {
    return this.stdout
  }

  getBaseFrame() {
    return this.baseFrame
  }

  print(str: string) {
    this.stdout += str
  }

  resetTimeout() {
    this.expireTimeMs = new Date().getTime() + this.maxExecutionTimeMs
    this.executedStatementCount = 0
  }

  checkTimeout() {
    if (this.executedStatementCount > 50 && new Date().getTime() > this.expireTimeMs) {
      throw new Error('execution timeout')
    }
  }
}
