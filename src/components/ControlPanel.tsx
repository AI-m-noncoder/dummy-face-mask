import { type MaskControls, DEFAULT_CONTROLS } from '../renderer/MaskRenderer'

interface Props {
  controls: MaskControls
  onChange: (c: MaskControls) => void
  fps: number
  status: string
  onMaskUpload: (img: HTMLImageElement | null) => void
  onBgUpload: (img: HTMLImageElement | null) => void
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 130, fontSize: 12, color: '#ccc', flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 44, fontSize: 12, textAlign: 'right', color: '#aaa' }}>
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginBottom: 4 }}>
      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, color: '#ddd' }}>{title}</div>
      {children}
    </div>
  )
}

export function ControlPanel({ controls, onChange, fps, status, onMaskUpload, onBgUpload }: Props) {
  const set = (key: keyof MaskControls) => (value: number | boolean | string) =>
    onChange({ ...controls, [key]: value })

  const handleFile = (cb: (img: HTMLImageElement) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); cb(img) }
      img.src = url
      e.target.value = ''
    }

  return (
    <div
      style={{
        width: 300,
        background: '#1a1a1a',
        borderRadius: 10,
        padding: '16px 18px',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        flexShrink: 0,
        boxSizing: 'border-box',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 14,
          padding: '6px 10px',
          background: '#2a2a2a',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <span style={{ color: '#8ef' }}>{status}</span>
        <span style={{ color: '#fa0', fontVariantNumeric: 'tabular-nums' }}>{fps} FPS</span>
      </div>

      {/* Mask upload */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Character Mask</div>
        <label
          style={{
            display: 'block',
            background: '#2a2a2a',
            border: '1px dashed #555',
            borderRadius: 6,
            padding: '8px 12px',
            cursor: 'pointer',
            textAlign: 'center',
            fontSize: 12,
            color: '#aaa',
          }}
        >
          Upload transparent PNG / SVG
          <input
            type="file"
            accept="image/png,image/svg+xml,image/webp"
            onChange={handleFile(onMaskUpload)}
            style={{ display: 'none' }}
          />
        </label>
        <button
          onClick={() => onMaskUpload(null)}
          style={{
            marginTop: 6,
            width: '100%',
            background: '#333',
            border: 'none',
            borderRadius: 5,
            padding: '5px 0',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Reset to default mask
        </button>
      </div>

      <Section title="Background">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {(['camera', 'color', 'image'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => set('bgMode')(mode)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: controls.bgMode === mode ? 700 : 400,
                background: controls.bgMode === mode ? '#5b3d8f' : '#333',
                color: controls.bgMode === mode ? '#fff' : '#aaa',
              }}
            >
              {mode === 'camera' ? 'Камера' : mode === 'color' ? 'Цвет' : 'Картинка'}
            </button>
          ))}
        </div>

        {controls.bgMode === 'color' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#ccc' }}>Цвет</span>
            <input
              type="color"
              value={controls.bgColor}
              onChange={(e) => set('bgColor')(e.target.value)}
              style={{ width: 40, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: '#888' }}>{controls.bgColor}</span>
          </div>
        )}

        {controls.bgMode === 'image' && (
          <label style={{
            display: 'block', background: '#2a2a2a', border: '1px dashed #555',
            borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
            textAlign: 'center', fontSize: 12, color: '#aaa', marginBottom: 6,
          }}>
            Загрузить фон
            <input type="file" accept="image/*" onChange={handleFile(onBgUpload)} style={{ display: 'none' }} />
          </label>
        )}
      </Section>

      <Section title="Anchor points on your image">
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
          Укажи, где на картинке находятся глаза и рот (0 = верх, 1 = низ).
        </div>
        <Slider
          label="Eye level (Y)"
          value={controls.anchorEyeY}
          min={0.1} max={0.9} step={0.01}
          onChange={set('anchorEyeY') as (v: number) => void}
          format={v => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Mouth level (Y)"
          value={controls.anchorMouthY}
          min={0.2} max={1.0} step={0.01}
          onChange={set('anchorMouthY') as (v: number) => void}
          format={v => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Eye spread (X)"
          value={controls.anchorEyeSpread}
          min={0.1} max={0.49} step={0.01}
          onChange={set('anchorEyeSpread') as (v: number) => void}
          format={v => `${Math.round(v * 100)}% / ${Math.round((1-v) * 100)}%`}
        />
      </Section>

      <Section title="Transform">
        <Slider
          label="Scale"
          value={controls.scale}
          min={0.5} max={5.0} step={0.05}
          onChange={set('scale') as (v: number) => void}
        />
        <Slider
          label="Offset X"
          value={controls.offsetX}
          min={-1} max={1} step={0.01}
          onChange={set('offsetX') as (v: number) => void}
        />
        <Slider
          label="Offset Y"
          value={controls.offsetY}
          min={-1} max={1} step={0.01}
          onChange={set('offsetY') as (v: number) => void}
        />
        <Slider
          label="Oval expand"
          value={controls.ovalExpand}
          min={0.5} max={4.0} step={0.05}
          onChange={set('ovalExpand') as (v: number) => void}
        />
        <Slider
          label="Opacity"
          value={controls.opacity}
          min={0} max={1} step={0.01}
          onChange={set('opacity') as (v: number) => void}
          format={v => `${Math.round(v * 100)}%`}
        />
      </Section>

      <Section title="Display">
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={controls.mirrored}
              onChange={(e) => set('mirrored')(e.target.checked)}
            />
            Mirror
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={controls.debug}
              onChange={(e) => set('debug')(e.target.checked)}
            />
            Debug
          </label>
        </div>
      </Section>

      <button
        onClick={() => onChange({ ...DEFAULT_CONTROLS })}
        style={{
          marginTop: 14,
          width: '100%',
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: 6,
          padding: '7px 0',
          color: '#aaa',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Reset all
      </button>
    </div>
  )
}
