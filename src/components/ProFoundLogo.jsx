/**
 * ProFound logomark
 *
 * "Pr" (charcoal bold sans-serif) + magnifying-glass-as-'o' (charcoal) + "Found" (crimson bold sans-serif)
 *
 * Alignment model:
 *   - Outer span: inline-flex, align-items:flex-end  → all children bottom-align
 *   - Text spans fill the full em-box (lineHeight:1), so their bottom edge
 *     sits ~0.2em below the text baseline (the descender zone)
 *   - SVG gets marginBottom:'0.2em', lifting it so its bottom edge lands on
 *     the text baseline
 *   - Circle cy=12 r=8 → circle bottom at y=20 = SVG element bottom = baseline ✓
 *   - Handle exits at 45° from the circle's bottom-right, extends below the
 *     baseline via overflow:visible (not clipped by flex container)
 *
 * Props:
 *   size — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 */

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ViewBox 0 0 20 20.
// Circle: cx=9, cy=12, r=8  → bottom at y=20 (SVG element bottom).
// Nodes: equilateral triangle inscribed at radius 5 from (9,12):
//   top (9,7) · lower-left (4.7,14.5) · lower-right (13.3,14.5)
// Handle: (15.4,18.4) → (22,25)  — entirely outside viewBox, rendered via overflow:visible
const VIEWBOX = '0 0 20 20'

// iconSize chosen so: circle diameter = 0.8×iconSize ≈ x-height of the font.
// (x-height of bold system-ui ≈ 0.52×fontSize; 0.8×iconSize = 0.52×fontSize → iconSize ≈ 0.65×fontSize)
const SIZES = {
  sm: { fontSize: '1.05rem', iconSize: 11 },
  md: { fontSize: '1.5rem',  iconSize: 16 },
  lg: { fontSize: '4.5rem',  iconSize: 47 },
}

export default function ProFoundLogo({ size = 'md' }) {
  const { fontSize, iconSize } = SIZES[size] ?? SIZES.md

  // Typography on the outer span so the SVG's marginBottom '0.2em' resolves
  // against the logo's own font-size (not whatever the parent sets).
  const baseStyle = {
    fontFamily: FONT,
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  }

  const ink = '#1a1a1a'

  return (
    <span style={{ ...baseStyle, display: 'inline-flex', alignItems: 'flex-end', overflow: 'visible', userSelect: 'none' }}>

      {/* "Pr" in charcoal */}
      <span style={{ color: ink }}>Pr</span>

      {/* Magnifying glass — circle bottom lands on text baseline */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0, overflow: 'visible', marginBottom: '0.083em' }}
      >
        {/* Lens ring — cy=12 places bottom at y=20 = SVG bottom = text baseline */}
        <circle cx="9" cy="12" r="8" fill="rgba(165,28,48,0.06)" stroke={ink} strokeWidth="2.0" />

        {/* Handle — starts just outside stroke edge at 45°, rounded cap,
            extends well below the baseline (outside viewBox via overflow:visible) */}
        <line
          x1="15.4" y1="18.4"
          x2="22"   y2="25"
          stroke={ink} strokeWidth="3.2" strokeLinecap="round"
        />

        {/* Network connections — equilateral triangle at radius 5 from lens center (9,12) */}
        <line x1="9"   y1="7"    x2="4.7"  y2="14.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9"   y1="7"    x2="13.3" y2="14.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4.7" y1="14.5" x2="13.3" y2="14.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />

        {/* Network nodes — solid dots rendered on top of connection lines */}
        <circle cx="9"    cy="7"    r="1.9" fill={ink} />
        <circle cx="4.7"  cy="14.5" r="1.9" fill={ink} />
        <circle cx="13.3" cy="14.5" r="1.9" fill={ink} />
      </svg>

      {/* "Found" in crimson */}
      <span style={{ color: '#A51C30' }}>Found</span>

    </span>
  )
}
