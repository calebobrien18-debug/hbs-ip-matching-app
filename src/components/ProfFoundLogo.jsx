/**
 * ProfFound logomark — detective magnifying glass.
 *
 * Fedora hat (top) + magnifying glass (body) + angled handle.
 * Hat = academic character; magnifying glass = the "finding" moment.
 *
 * Props:
 *   size   — height in px (width scales from 40×48 viewBox)
 *   color  — fill / stroke color (default white)
 */
export default function ProfFoundLogo({ size = 40, color = '#ffffff' }) {
  const width = size * (40 / 48)

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProfFound"
    >
      {/* ── Fedora hat ──────────────────────────────────── */}

      {/* Crown — smooth dome */}
      <path
        d="M9 16 Q9 3 20 2 Q31 3 31 16 Z"
        fill={color}
      />

      {/* Brim — wide, slight downward curve at edges */}
      <path
        d="M3 15 L37 15 L37 18.5 Q20 22 3 18.5 Z"
        fill={color}
      />

      {/* Hat band — a subtle darker crease at the crown base */}
      <path
        d="M9 15.5 Q20 13.5 31 15.5"
        stroke={color} strokeWidth="1.4" strokeOpacity="0.4" fill="none"
      />

      {/* ── Magnifying glass ────────────────────────────── */}

      {/* Lens glass tint */}
      <circle cx="20" cy="36" r="10" fill={color} fillOpacity="0.12" />

      {/* Lens ring */}
      <circle cx="20" cy="36" r="10" stroke={color} strokeWidth="2.8" fill="none" />

      {/* Glint — small highlight spot suggesting glass */}
      <circle cx="15.5" cy="31.5" r="1.6" fill={color} fillOpacity="0.35" />

      {/* Handle — thick, angled, rounded cap */}
      <line
        x1="27.5" y1="43.5"
        x2="37.5" y2="47"
        stroke={color} strokeWidth="3.4" strokeLinecap="round"
      />
    </svg>
  )
}
