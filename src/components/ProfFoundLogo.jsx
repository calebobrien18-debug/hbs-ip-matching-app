/**
 * ProfFound logomark.
 *
 * Concept:
 *  - Open book at base          → learning, academia
 *  - Two arcs rising & converging → two paths (student + professor) connecting
 *  - 4-pointed star at apex     → aspiration, the "Found" moment of discovery
 *  - Nodes along arcs (detail)  → network, connection points
 *
 * Props:
 *   size       — height in px (width scales proportionally from the 40×48 viewBox)
 *   color      — fill / stroke color (default white)
 *   showNodes  — render midpoint connection dots; recommended for size ≥ 48
 */
export default function ProfFoundLogo({ size = 40, color = '#ffffff', showNodes = false }) {
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
      {/* ── Open book ─────────────────────────────────── */}
      {/* Left page */}
      <path
        d="M3 46 L3 34 Q3 32 7 32 L20 32 L20 46 Z"
        fill={color}
        fillOpacity="0.88"
      />
      {/* Right page */}
      <path
        d="M20 32 L33 32 Q37 32 37 34 L37 46 Z"
        fill={color}
        fillOpacity="0.88"
      />
      {/* Spine crease */}
      <line
        x1="20" y1="32" x2="20" y2="46"
        stroke={color} strokeOpacity="0.3" strokeWidth="0.75"
      />

      {/* ── Rising arcs (cubic bézier) ────────────────── */}
      {/* Left: starts at left shoulder of book, bows outward, curves in to star */}
      <path
        d="M7 32 C0 22 8 9 20 5"
        stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none"
        strokeOpacity="0.92"
      />
      {/* Right: mirror */}
      <path
        d="M33 32 C40 22 32 9 20 5"
        stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none"
        strokeOpacity="0.92"
      />

      {/* ── Connection nodes (shown at larger sizes) ──── */}
      {showNodes && (
        <>
          {/* Computed from cubic bézier at t≈0.35 and t≈0.65 */}
          <circle cx="5"  cy="21" r="2"   fill={color} fillOpacity="0.65" />
          <circle cx="9"  cy="12" r="1.6" fill={color} fillOpacity="0.55" />
          <circle cx="35" cy="21" r="2"   fill={color} fillOpacity="0.65" />
          <circle cx="31" cy="12" r="1.6" fill={color} fillOpacity="0.55" />
        </>
      )}

      {/* ── 4-pointed star at apex ────────────────────── */}
      {/*  outer points: top(20,1.5) right(23.5,5) bottom(20,8.5) left(16.5,5)
           inner points: (21.5,3.5) (21.5,6.5) (18.5,6.5) (18.5,3.5)          */}
      <path
        d="M20 1.5 L21.5 3.5 L23.5 5 L21.5 6.5 L20 8.5 L18.5 6.5 L16.5 5 L18.5 3.5 Z"
        fill={color}
      />
    </svg>
  )
}
