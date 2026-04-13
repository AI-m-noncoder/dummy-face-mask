// Default cartoon mask as an inline SVG data URL.
// A stylized fox/cat face with hollow eyes and nose so the real face shows through partially.
export const DEFAULT_MASK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="200" height="220">
  <!-- Outer face shape -->
  <ellipse cx="100" cy="115" rx="90" ry="100" fill="#FF9F43" stroke="#E67E22" stroke-width="3"/>

  <!-- Ear left -->
  <polygon points="18,50 5,5 55,40" fill="#FF9F43" stroke="#E67E22" stroke-width="2"/>
  <polygon points="22,46 15,18 48,38" fill="#FFD6B8"/>

  <!-- Ear right -->
  <polygon points="182,50 195,5 145,40" fill="#FF9F43" stroke="#E67E22" stroke-width="2"/>
  <polygon points="178,46 185,18 152,38" fill="#FFD6B8"/>

  <!-- Forehead stripe -->
  <ellipse cx="100" cy="70" rx="18" ry="22" fill="#FFD6B8" opacity="0.6"/>

  <!-- Eye sockets - hollow (shows through) -->
  <ellipse cx="68" cy="105" rx="22" ry="18" fill="white" opacity="0.15"/>
  <ellipse cx="132" cy="105" rx="22" ry="18" fill="white" opacity="0.15"/>

  <!-- Eye outline left -->
  <ellipse cx="68" cy="105" rx="22" ry="18" fill="none" stroke="#2C1810" stroke-width="3"/>
  <!-- Iris + pupil left -->
  <ellipse cx="68" cy="105" rx="14" ry="14" fill="#5B3D8F"/>
  <ellipse cx="68" cy="105" rx="8" ry="9" fill="#1A0A2E"/>
  <circle cx="73" cy="100" r="3" fill="white" opacity="0.9"/>

  <!-- Eye outline right -->
  <ellipse cx="132" cy="105" rx="22" ry="18" fill="none" stroke="#2C1810" stroke-width="3"/>
  <!-- Iris + pupil right -->
  <ellipse cx="132" cy="105" rx="14" ry="14" fill="#5B3D8F"/>
  <ellipse cx="132" cy="105" rx="8" ry="9" fill="#1A0A2E"/>
  <circle cx="137" cy="100" r="3" fill="white" opacity="0.9"/>

  <!-- Eyebrow left -->
  <path d="M46,85 Q68,73 90,83" stroke="#2C1810" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- Eyebrow right -->
  <path d="M110,83 Q132,73 154,85" stroke="#2C1810" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- Nose -->
  <ellipse cx="100" cy="138" rx="10" ry="7" fill="#E67E22" stroke="#2C1810" stroke-width="1.5"/>

  <!-- Mouth - closed smile -->
  <path d="M78,158 Q100,172 122,158" stroke="#2C1810" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- Cheek marks left -->
  <line x1="22" y1="130" x2="55" y2="125" stroke="#E67E22" stroke-width="2" opacity="0.7"/>
  <line x1="20" y1="140" x2="53" y2="137" stroke="#E67E22" stroke-width="2" opacity="0.7"/>
  <line x1="22" y1="150" x2="55" y2="149" stroke="#E67E22" stroke-width="2" opacity="0.7"/>

  <!-- Cheek marks right -->
  <line x1="178" y1="130" x2="145" y2="125" stroke="#E67E22" stroke-width="2" opacity="0.7"/>
  <line x1="180" y1="140" x2="147" y2="137" stroke="#E67E22" stroke-width="2" opacity="0.7"/>
  <line x1="178" y1="150" x2="145" y2="149" stroke="#E67E22" stroke-width="2" opacity="0.7"/>
</svg>
`

export function createDefaultMaskImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([DEFAULT_MASK_SVG], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}
