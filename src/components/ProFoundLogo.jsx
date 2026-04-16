/**
 * ProFound logomark
 *
 * "Pr" (charcoal bold sans-serif) + magnifying-glass-as-'o' (charcoal) + "Found" (crimson bold sans-serif)
 *
 * Alignment: flex-end + marginBottom:'0.2em' on the SVG places the bottom of the
 * lens circle on the text baseline, matching the bottom of lowercase letters.
 * The handle exits the circle at 45° and extends below the baseline via overflow:visible.
 *
 * Props:
 *   size — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 */

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// Lens circle at (9,9) r=8 in a 20×20 viewBox.
// iconSize is calibrated so rendered circle diameter ≈ x-height of the font (≈ 0.8 × iconSize).
// Handle runs from just outside the stroke edge (15.4,15.4) → (22,22), extending past
// the viewBox; overflow:visible renders it without clipping.
const VIEWBOX = '0 0 20 20'

const SIZES = {
  sm: { fontSize: '1.05rem', iconSize: 11 },
  md: { fontSize: '1.5rem',  iconSize: 16 },
  lg: { fontSize: '4.5rem',  iconSize: 47 },
}

export default function ProFoundLogo({ size = 'md' }) {
  const { fontSize, iconSize } = SIZES[size] ?? SIZES.md

  // All typography on the outer span so 'em' units inside (marginBottom) resolve correctly.
  const baseStyle = {
    fontFamily: FONT,
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  }

  const ink = '#1a1a1a'

  return (
    <span style={{ ...baseStyle, display: 'inline-flex', alignItems: 'flex-end', userSelect: 'none' }}>
      {/* "Pr" in charcoal */}
      <span style={{ color: ink }}>Pr</span>

      {/* Magnifying glass — sized to x-height, bottom at baseline */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0, overflow: 'visible', marginBottom: '0.2em' }}
      >
        {/* Lens — very light crimson tint gives the glass a subtle warmth */}
        <circle cx="9" cy="9" r="8" fill="rgba(165,28,48,0.06)" stroke={ink} strokeWidth="2.0" />

        {/* Handle — starts just past the stroke outer edge (r + strokeWidth/2 ≈ 9 units)
            at 45°, giving a clean gap between ring and handle.
            Rounded cap, extends well below the circle for clear magnifying-glass silhouette. */}
        <line
          x1="15.4" y1="15.4"
          x2="22"   y2="22"
          stroke={ink} strokeWidth="3.2" strokeLinecap="round"
        />

        {/* Network connections — equilateral triangle inscribed at radius 5 from lens center.
            Nodes at: top (9,4), lower-left (4.7,11.5), lower-right (13.3,11.5).
            strokeLinecap="round" softens the line ends at the nodes. */}
        <line x1="9"   y1="4"    x2="4.7"  y2="11.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9"   y1="4"    x2="13.3" y2="11.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4.7" y1="11.5" x2="13.3" y2="11.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />

        {/* Network nodes — solid filled circles on top of the connection lines */}
        <circle cx="9"    cy="4"    r="1.9" fill={ink} />
        <circle cx="4.7"  cy="11.5" r="1.9" fill={ink} />
        <circle cx="13.3" cy="11.5" r="1.9" fill={ink} />
      </svg>

      {/* "Found" in crimson */}
      <span style={{ color: '#A51C30' }}>Found</span>
    </span>
  )
}
