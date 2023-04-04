import { Frame } from './frame'

export interface CProgramContext {
  stdout: string
  baseFrame: Frame
  currentLine: number
  startTimeMs: number
  maxExecutionTimeMs: number
  executedStatementCount: number
}

export function initCProgramContext(maxExecTimMs: number = 1000): CProgramContext {
  return {
    stdout: '',
    baseFrame: Frame.extend(Frame.getBuiltinFrame()),
    currentLine: 0,
    startTimeMs: new Date().getTime(),
    maxExecutionTimeMs: maxExecTimMs,
    executedStatementCount: 0
  }
}

export function checkTimeout(context: CProgramContext) {
  if (
    context.executedStatementCount > 50 &&
    new Date().getTime() > context.startTimeMs + context.maxExecutionTimeMs
  ) {
    throw new Error('execution timeout')
  }
}
