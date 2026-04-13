import { useState } from 'react'
import { CameraCanvas } from './components/CameraCanvas'
import { ControlPanel } from './components/ControlPanel'
import { type MaskControls, DEFAULT_CONTROLS } from './renderer/MaskRenderer'
import './App.css'

export default function App() {
  const [controls, setControls] = useState<MaskControls>({ ...DEFAULT_CONTROLS })
  const [fps, setFps] = useState(0)
  const [status, setStatus] = useState('Initialising...')
  const [customMask, setCustomMask] = useState<HTMLImageElement | null>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <h1>FaceMask AR</h1>
        <p className="subtitle">Real-time face replacement — MediaPipe + Canvas 2D</p>
      </header>

      <main className="app-main">
        <CameraCanvas
          controls={controls}
          customMaskImage={customMask}
          bgImage={bgImage}
          onFps={setFps}
          onStatus={setStatus}
        />
        <ControlPanel
          controls={controls}
          onChange={setControls}
          fps={fps}
          status={status}
          onMaskUpload={setCustomMask}
          onBgUpload={setBgImage}
        />
      </main>
    </div>
  )
}
