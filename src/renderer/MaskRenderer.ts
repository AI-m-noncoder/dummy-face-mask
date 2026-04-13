import { type FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { EMA } from '../hooks/useSmoother'
import { computeAffine } from './affine'

// MediaPipe iris center landmarks (present in face_landmarker model)
const LEFT_IRIS = 468
const RIGHT_IRIS = 473

// Fallback eye centers if iris points are unavailable
const LEFT_EYE_INNER = 133
const LEFT_EYE_OUTER = 33
const RIGHT_EYE_INNER = 362
const RIGHT_EYE_OUTER = 263

// Mouth landmarks
const MOUTH_LEFT = 61
const MOUTH_RIGHT = 291
const MOUTH_TOP = 0
const MOUTH_BOTTOM = 17

// Face oval landmark indices (MediaPipe canonical order)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
]

export interface MaskControls {
  scale: number
  offsetX: number
  offsetY: number
  opacity: number
  debug: boolean
  mirrored: boolean
  anchorEyeY: number
  anchorMouthY: number
  anchorEyeSpread: number
  ovalExpand: number
  // Background
  bgMode: 'camera' | 'color' | 'image'
  bgColor: string
}

export const DEFAULT_CONTROLS: MaskControls = {
  scale: 1.1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  debug: false,
  mirrored: true,
  anchorEyeY: 0.48,
  anchorMouthY: 0.75,
  anchorEyeSpread: 0.34,
  ovalExpand: 1.08,
  bgMode: 'camera',
  bgColor: '#1a1a2e',
}

// Smoothers for the 3 anchor destination points (left eye, right eye, mouth)
class PointSmoother {
  private x = new EMA(0.6)
  private y = new EMA(0.6)
  update(px: number, py: number): [number, number] {
    return [this.x.update(px), this.y.update(py)]
  }
  reset() { this.x.reset(); this.y.reset() }
}

export class MaskRenderer {
  private maskImage: HTMLImageElement | null = null
  private bgImage: HTMLImageElement | null = null
  private leftEyeSm = new PointSmoother()
  private rightEyeSm = new PointSmoother()
  private mouthSm = new PointSmoother()

  setBg(img: HTMLImageElement | null) {
    this.bgImage = img
  }

  setMask(img: HTMLImageElement | null) {
    this.maskImage = img
  }

  render(
    ctx: CanvasRenderingContext2D,
    result: FaceLandmarkerResult,
    videoEl: HTMLVideoElement,
    controls: MaskControls,
  ) {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)

    // --- Draw background ---
    if (controls.bgMode === 'camera') {
      ctx.save()
      if (controls.mirrored) { ctx.translate(width, 0); ctx.scale(-1, 1) }
      ctx.drawImage(videoEl, 0, 0, width, height)
      ctx.restore()
    } else if (controls.bgMode === 'color') {
      ctx.fillStyle = controls.bgColor
      ctx.fillRect(0, 0, width, height)
    } else if (controls.bgMode === 'image' && this.bgImage) {
      // Cover-fit the background image
      const scale = Math.max(width / this.bgImage.width, height / this.bgImage.height)
      const bw = this.bgImage.width * scale
      const bh = this.bgImage.height * scale
      ctx.drawImage(this.bgImage, (width - bw) / 2, (height - bh) / 2, bw, bh)
    } else {
      ctx.fillStyle = controls.bgColor
      ctx.fillRect(0, 0, width, height)
    }

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return

    const lms = result.faceLandmarks[0]
    const blendshapes = result.faceBlendshapes?.[0]?.categories

    const px = (i: number) => lms[i].x * width
    const py = (i: number) => lms[i].y * height

    // --- Derive the 3 destination anchor points ---
    const hasIris = lms.length > 468

    const rawLeftEye: [number, number] = hasIris
      ? [px(LEFT_IRIS), py(LEFT_IRIS)]
      : [(px(LEFT_EYE_INNER) + px(LEFT_EYE_OUTER)) / 2, (py(LEFT_EYE_INNER) + py(LEFT_EYE_OUTER)) / 2]

    const rawRightEye: [number, number] = hasIris
      ? [px(RIGHT_IRIS), py(RIGHT_IRIS)]
      : [(px(RIGHT_EYE_INNER) + px(RIGHT_EYE_OUTER)) / 2, (py(RIGHT_EYE_INNER) + py(RIGHT_EYE_OUTER)) / 2]

    const rawMouth: [number, number] = [
      (px(MOUTH_LEFT) + px(MOUTH_RIGHT)) / 2,
      (py(MOUTH_TOP) + py(MOUTH_BOTTOM)) / 2,
    ]

    // Mirror: flip X around canvas center so anchors are in correct screen space
    const mirrorX = (x: number) => controls.mirrored ? width - x : x
    const dstLeftEye = this.leftEyeSm.update(mirrorX(rawLeftEye[0]), rawLeftEye[1])
    const dstRightEye = this.rightEyeSm.update(mirrorX(rawRightEye[0]), rawRightEye[1])
    const dstMouth = this.mouthSm.update(mirrorX(rawMouth[0]), rawMouth[1])

    // Apply user scale + offset on top of affine
    // inter-eye distance used as unit for offsets
    const eyeDist = Math.hypot(
      dstRightEye[0] - dstLeftEye[0],
      dstRightEye[1] - dstLeftEye[1],
    )
    const offsetPx = eyeDist * controls.offsetX
    const offsetPy = eyeDist * controls.offsetY

    const dL: [number, number] = [dstLeftEye[0] + offsetPx, dstLeftEye[1] + offsetPy]
    const dR: [number, number] = [dstRightEye[0] + offsetPx, dstRightEye[1] + offsetPy]
    const dM: [number, number] = [dstMouth[0] + offsetPx, dstMouth[1] + offsetPy]

    // --- Compute face oval clip path ---
    const ovalCx = (dL[0] + dR[0]) / 2
    const ovalCy = (dL[1] + dM[1]) / 2
    const exp = controls.ovalExpand

    ctx.save()
    ctx.beginPath()
    FACE_OVAL.forEach((idx, i) => {
      const ox = mirrorX(lms[idx].x * width)
      const oy = lms[idx].y * height
      // expand outward from oval center
      const ex = ovalCx + (ox - ovalCx) * exp
      const ey = ovalCy + (oy - ovalCy) * exp
      if (i === 0) ctx.moveTo(ex, ey)
      else ctx.lineTo(ex, ey)
    })
    ctx.closePath()
    ctx.clip()

    // --- Draw mask with affine transform ---
    if (this.maskImage) {
      const imgW = this.maskImage.naturalWidth || this.maskImage.width
      const imgH = this.maskImage.naturalHeight || this.maskImage.height

      // Source anchor points on the character image
      const sL: [number, number] = [controls.anchorEyeSpread * imgW, controls.anchorEyeY * imgH]
      const sR: [number, number] = [(1 - controls.anchorEyeSpread) * imgW, controls.anchorEyeY * imgH]
      const sM: [number, number] = [imgW * 0.5, controls.anchorMouthY * imgH]

      const [a, b, c, d, e, f] = computeAffine([sL, sR, sM], [dL, dR, dM])

      // Apply extra uniform scale around the face center (between eyes and mouth)
      const faceCx = (dL[0] + dR[0]) / 2
      const faceCy = (dL[1] + dM[1]) / 2
      const s = controls.scale
      // Scale the affine output around face center:
      // T_scaled = T_to_face_center * S * T_from_face_center * T_affine
      // In practice: scale (a,b,c,d) and adjust (e,f) to scale around faceCx/faceCy
      const a2 = a * s, b2 = b * s, c2 = c * s, d2 = d * s
      const e2 = e * s + faceCx * (1 - s)
      const f2 = f * s + faceCy * (1 - s)

      ctx.globalAlpha = controls.opacity
      ctx.setTransform(a2, b2, c2, d2, e2, f2)
      ctx.drawImage(this.maskImage, 0, 0, imgW, imgH)
    }

    ctx.restore()

    // --- Debug overlay (drawn after restore so it's in screen space) ---
    if (controls.debug) {
      const jawOpen = blendshapes?.find(c => c.categoryName === 'jawOpen')?.score ?? 0
      const eyeL = blendshapes?.find(c => c.categoryName === 'eyeBlinkLeft')?.score ?? 0
      const eyeR = blendshapes?.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0
      this.drawDebug(ctx, lms, width, height, dL, dR, dM, jawOpen, eyeL, eyeR, controls.mirrored)
    }
  }

  private drawDebug(
    ctx: CanvasRenderingContext2D,
    lms: Array<{ x: number; y: number; z: number }>,
    w: number,
    h: number,
    dL: [number, number],
    dR: [number, number],
    dM: [number, number],
    jawOpen: number,
    eyeL: number,
    eyeR: number,
    mirrored: boolean,
  ) {
    const mirrorX = (x: number) => mirrored ? w - x : x

    // All landmarks
    ctx.fillStyle = 'rgba(0,255,100,0.5)'
    for (const lm of lms) {
      ctx.beginPath()
      ctx.arc(mirrorX(lm.x * w), lm.y * h, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Face oval
    ctx.strokeStyle = 'rgba(255,220,0,0.8)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    FACE_OVAL.forEach((idx, i) => {
      const x = mirrorX(lms[idx].x * w)
      const y = lms[idx].y * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()

    // Anchor points
    const anchors: [[number, number], string][] = [
      [dL, 'cyan'],
      [dR, 'cyan'],
      [dM, 'orange'],
    ]
    for (const [[ax, ay], color] of anchors) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ax, ay, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax - 9, ay); ctx.lineTo(ax + 9, ay)
      ctx.moveTo(ax, ay - 9); ctx.lineTo(ax, ay + 9)
      ctx.stroke()
    }

    // Blendshape readout
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(4, 4, 160, 70)
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.fillText(`jaw:  ${jawOpen.toFixed(2)}`, 10, 22)
    ctx.fillText(`eyeL: ${eyeL.toFixed(2)}`, 10, 40)
    ctx.fillText(`eyeR: ${eyeR.toFixed(2)}`, 10, 58)
  }

  reset() {
    this.leftEyeSm.reset()
    this.rightEyeSm.reset()
    this.mouthSm.reset()
  }
}
