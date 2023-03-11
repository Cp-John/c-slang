export class Frame {
  private boundings
  private prev: Frame | null

  private static rootFrame: Frame = new Frame(null)

  static getRootFrame(): Frame {
    return Frame.rootFrame
  }

  private constructor(prev: Frame | null) {
    this.boundings = {}
    this.prev = prev
  }

  private findFrameWith(name: string): Frame {
    if (name in this.boundings) {
      return this
    }
    let currentFrame = this.prev
    while (currentFrame != null && !(name in currentFrame.boundings)) {
      currentFrame = currentFrame.prev
    }
    if (currentFrame == null) {
      throw new Error('undeclared identifier: ' + name)
    }
    return currentFrame
  }

  lookup(name: string) {
    const frame = this.findFrameWith(name)
    if (frame.boundings[name] == undefined) {
      throw new Error('unbounded identifier: ' + name)
    }
    return frame.boundings[name]
  }

  declare(name: string) {
    if (name in this.boundings) {
      throw new Error('redefinition of ' + name)
    }
    this.boundings[name] = undefined
  }

  assignValue(name: string, val: any) {
    this.findFrameWith(name).boundings[name] = val
  }

  static extend(prev: Frame) {
    return new Frame(prev)
  }
}
