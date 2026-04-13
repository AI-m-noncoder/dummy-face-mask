import { useEffect, useRef, useState, useCallback } from 'react'
import { useFaceTracker, type FaceResult } from '../hooks/useFaceTracker'
import { MaskRenderer, type MaskControls } from '../renderer/MaskRenderer'
import { createDefaultMaskImage } from '../assets/defaultMask'

interface Props {
  controls: MaskControls
  customMaskImage: HTMLImageElement | null
  bgImage: HTMLImageElement | null
  onFps: (fps: number) => void
  onStatus: (s: string) => void
}

export function CameraCanvas({ controls, customMaskImage, bgImage, onFps, onStatus }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef(new MaskRenderer())
  const fpsRef = useRef({ frames: 0, last: performance.now() })
  const latestResultRef = useRef<FaceResult | null>(null)
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  const [ready, setReady] = useState(false)

  useEffect(() => {
    createDefaultMaskImage().then((img) => {
      if (!customMaskImage) rendererRef.current.setMask(img)
    })
  }, [])

  useEffect(() => {
    rendererRef.current.setMask(customMaskImage)
    if (!customMaskImage) {
      createDefaultMaskImage().then((img) => rendererRef.current.setMask(img))
    }
  }, [customMaskImage])

  useEffect(() => {
    rendererRef.current.setBg(bgImage)
  }, [bgImage])

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s
        const video = videoRef.current!
        video.srcObject = s
        video.play()
        video.onloadedmetadata = () => {
          const canvas = canvasRef.current!
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          setReady(true)
          onStatus('Tracking...')
        }
      })
      .catch(() => onStatus('Camera permission denied'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [onStatus])

  const handleResult = useCallback((result: FaceResult) => {
    latestResultRef.current = result
  }, [])

  useFaceTracker({ videoRef, onResult: handleResult, enabled: ready })

  useEffect(() => {
    if (!ready) return
    let rafId: number
    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return
      const ctx = canvas.getContext('2d')!
      const result = latestResultRef.current
      if (result) {
        rendererRef.current.render(ctx, result, video, controlsRef.current)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        if (controlsRef.current.mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
      const fps = fpsRef.current
      fps.frames++
      const now = performance.now()
      if (now - fps.last >= 1000) {
        onFps(Math.round((fps.frames * 1000) / (now - fps.last)))
        fps.frames = 0
        fps.last = now
      }
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [ready, onFps])

  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }} />
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#111', color: '#ccc',
          borderRadius: 8, minWidth: 640, minHeight: 360, fontSize: 16,
        }}>
          Requesting camera...
        </div>
      )}
    </div>
  )
}
