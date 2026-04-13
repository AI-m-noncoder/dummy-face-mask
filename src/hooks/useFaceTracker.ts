import { useEffect, useRef, useCallback } from 'react'
import {
  FaceLandmarker,
  type FaceLandmarkerResult,
  FilesetResolver,
} from '@mediapipe/tasks-vision'

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

export type FaceResult = FaceLandmarkerResult

let landmarkerSingleton: FaceLandmarker | null = null
let initPromise: Promise<FaceLandmarker> | null = null

async function getLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerSingleton) return landmarkerSingleton
  if (initPromise) return initPromise

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    const lm = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    })
    landmarkerSingleton = lm
    return lm
  })()
  return initPromise
}

interface UseFaceTrackerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onResult: (result: FaceResult, timestamp: number) => void
  enabled: boolean
}

export function useFaceTracker({ videoRef, onResult, enabled }: UseFaceTrackerOptions) {
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(-1)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const startLoop = useCallback(async () => {
    const lm = await getLandmarker()
    landmarkerRef.current = lm

    const tick = (nowMs: number) => {
      if (!enabled) return
      rafRef.current = requestAnimationFrame(tick)

      const video = videoRef.current
      if (!video || video.readyState < 2) return
      if (nowMs === lastTimeRef.current) return
      lastTimeRef.current = nowMs

      const result = lm.detectForVideo(video, nowMs)
      onResultRef.current(result, nowMs)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [enabled, videoRef])

  useEffect(() => {
    if (!enabled) return
    startLoop()
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, startLoop])
}
