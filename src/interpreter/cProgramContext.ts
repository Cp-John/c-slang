import { Frame } from './frame'

export interface CProgramContext {
  stdout: string
  baseFrame: Frame
  currentLine: number
}
