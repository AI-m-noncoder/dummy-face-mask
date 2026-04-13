// Exponential moving average smoother for scalar and object values.
// alpha = 0 means no smoothing, alpha = 1 means full smoothing (never moves).

export class EMA {
  private alpha: number
  private value: number | null = null

  constructor(alpha = 0.5) {
    this.alpha = alpha
  }

  update(v: number): number {
    if (this.value === null) {
      this.value = v
    } else {
      this.value = this.alpha * this.value + (1 - this.alpha) * v
    }
    return this.value
  }

  reset() {
    this.value = null
  }
}

export interface SmoothedPose {
  x: number
  y: number
  width: number
  height: number
  rotation: number  // radians
}

// Wraps multiple EMA instances to smooth a full face pose in one call.
export class PoseSmoother {
  private x = new EMA(0.6)
  private y = new EMA(0.6)
  private w = new EMA(0.6)
  private h = new EMA(0.6)
  private r = new EMA(0.5)

  update(pose: SmoothedPose): SmoothedPose {
    return {
      x: this.x.update(pose.x),
      y: this.y.update(pose.y),
      width: this.w.update(pose.width),
      height: this.h.update(pose.height),
      rotation: this.r.update(pose.rotation),
    }
  }

  reset() {
    this.x.reset()
    this.y.reset()
    this.w.reset()
    this.h.reset()
    this.r.reset()
  }
}
