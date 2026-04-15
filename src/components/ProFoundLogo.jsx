/**
 * ProFound logomark
 *
 * "Pr" (charcoal bold sans-serif) + magnifying-glass-as-'o' (charcoal) + "Found" (crimson bold sans-serif)
 *
 * The icon is sized to match the x-height of the font so the magnifying glass
 * reads as the letter 'o', making the whole mark read as one word: ProFound.
 * The handle extends below via overflow:visible.
 *
 * Props:
 *   size — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 */

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// Circle at (9,9) r=8 in a 20×20 viewBox.
// At each iconSize, the rendered circle diameter = iconSize × (16/20) ≈ x-height of the font.
// Handle exits at ~(14.7,14.7) → (19.5,19.5); overflow:visible lets it render past the box edge.
const VIEWBOX = '0 0 20 20'

const SIZES = {
  sm: { fontSize: '1.05rem', iconSize: 11 },
  md: { fontSize: '1.5rem',  iconSize: 16 },
  lg: { fontSize: '4.5rem',  iconSize: 47 },
}

export default function ProFoundLogo({ size = 'md' }) {
  const { fontSize, iconSize } = SIZES[size] ?? SIZES.md

  const textStyle = {
    fontFamily: FONT,
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  }

  const ink = '#1a1a1a'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1, userSelect: 'none' }}>
      {/* "Pr" in charcoal */}
      <span style={{ ...textStyle, color: ink }}>Pr</span>

      {/* Magnifying glass — replaces the 'o' */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
      >
        {/* Lens ring */}
        <circle cx="9" cy="9" r="8" stroke={ink} strokeWidth="1.6" />

        {/* Handle — angled lower-right, rounded cap */}
        <line
          x1="14.7" y1="14.7"
          x2="19.5" y2="19.5"
          stroke={ink} strokeWidth="2.4" strokeLinecap="round"
        />

        {/* Network connections (drawn beneath nodes) */}
        <line x1="9" y1="4"  x2="5"  y2="14" stroke={ink} strokeWidth="0.75" strokeLinecap="round" />
        <line x1="9" y1="4"  x2="13" y2="14" stroke={ink} strokeWidth="0.75" strokeLinecap="round" />
        <line x1="5" y1="14" x2="13" y2="14" stroke={ink} strokeWidth="0.75" strokeLinecap="round" />

        {/* Network nodes */}
        <circle cx="9"  cy="4"  r="1.3" fill={ink} />
        <circle cx="5"  cy="14" r="1.3" fill={ink} />
        <circle cx="13" cy="14" r="1.3" fill={ink} />
      </svg>

      {/* "Found" in crimson */}
      <span style={{ ...textStyle, color: '#A51C30' }}>Found</span>
    </span>
  )
}
