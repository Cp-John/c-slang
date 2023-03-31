import { Frame } from './frame'

export interface CProgramContext {
  stdout: string
  baseFrame: Frame
  currentLine: number
  startTimeMs: number
  maxExecutionTimeMs: number
}

export function checkTimeout(context: CProgramContext) {
  if (new Date().getTime() > context.startTimeMs + context.maxExecutionTimeMs) {
    throw new Error('execution timeout')
  }
}