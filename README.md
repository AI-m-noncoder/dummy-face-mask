<img width="1699" height="862" alt="Снимок экрана 2026-04-14 в 00 00 08" src="https://github.com/user-attachments/assets/1dadd509-a91c-499c-a61c-a3bb5a133aac" /># FaceMask AR


A browser-based real-time face mask / AR avatar app using MediaPipe Face Landmarker and Canvas 2D. No backend required — everything runs locally in your browser.
---

## Setup & Run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in Chrome or Edge (Firefox has limited WASM thread support).

> **Note:** The app fetches the MediaPipe WASM runtime and face model from CDN on first load (~10 MB). After that it is cached.

---

## Usage

1. Allow camera access when prompted.
2. The default cartoon fox mask will appear over your face immediately.
3. Use the **Control Panel** on the right to:
   - Upload a transparent PNG to use as your own custom mask.
   - Adjust **scale**, **X/Y offset**, **rotation offset**, and **opacity** with sliders.
   - Toggle **Mirror** (default on) and **Debug mode**.
   - Reset to defaults at any time.

---

## Architecture

```
src/
  hooks/
    useFaceTracker.ts   — MediaPipe FaceLandmarker lifecycle, rAF detect loop
    useSmoother.ts      — Exponential moving average (EMA) for pose stabilisation
  renderer/
    MaskRenderer.ts     — Canvas 2D draw logic: video frame + mask transform + debug overlay
  components/
    CameraCanvas.tsx    — Webcam setup, render loop, wires tracker → renderer
    ControlPanel.tsx    — All UI controls, file upload
  assets/
    defaultMask.ts      — Inline SVG cartoon fox mask as fallback
  App.tsx               — Root state: controls, FPS, status
```

### Data flow

```
Webcam → <video> (hidden)
            ↓
    useFaceTracker (rAF)
            ↓ FaceLandmarkerResult
    latestResultRef (shared ref, no re-render)
            ↓
    Render rAF loop → MaskRenderer.render()
            ↓
    PoseSmoother (EMA) → final transform
            ↓
    Canvas 2D: drawImage(video) + drawImage(mask, rotated/scaled)
```

The tracking loop and render loop are independent `requestAnimationFrame` loops so rendering never stalls waiting for a MediaPipe result.

### Key design decisions

- **Canvas 2D over WebGL** — sufficient for a 2D overlay, simpler code, easier to extend.
- **Singleton landmarker** — MediaPipe is expensive to initialise; created once and reused.
- **Ref-based result sharing** — avoids React re-renders on every frame (60+ per second).
- **EMA smoothing** — exponential moving average on x/y/w/h/rotation removes jitter without adding visible lag.
- **Expression response** — `jawOpen` blendshape stretches mask height slightly; `eyeBlink` is available for future use.

---

## TODO / Next Steps

- [ ] **Better UV mapping** — use a face mesh warp (affine or thin-plate-spline) to map the mask texture to individual landmark triangles for a true face-conform fit.
- [ ] **Mouth region deformation** — cut the mouth area out of the mask and deform it with jaw-open / lip corner blendshapes.
- [ ] **Eye tracking** — blink detection driving eyelid animation on the mask.
- [ ] **Multiple expressions** — map the full 52 MediaPipe blendshapes to morph targets on the mask.
- [ ] **3D avatar mode** — replace Canvas 2D with Three.js and load a GLTF head model driven by the facial transformation matrix.
- [ ] **OBS / virtual camera** — pipe the canvas output through a virtual camera (e.g. OBS Browser Source + v4l2loopback on Linux, or OBS macOS virtual camera).
- [ ] **Multiple faces** — change `numFaces: 1` to `numFaces: N` and iterate in the renderer.
- [ ] **Offline WASM** — bundle the MediaPipe WASM assets locally so the app works without internet.
