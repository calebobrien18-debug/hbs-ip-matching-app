/**
 * ProFound wordmark
 *
 * "Pro" in charcoal · "Found" in crimson
 * Single bold sans-serif word, no icon.
 *
 * Props:
 *   size — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 */

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

const SIZES = {
  sm: { fontSize: '1.05rem' },
  md: { fontSize: '1.5rem'  },
  lg: { fontSize: '4.5rem'  },
}

const INK     = '#1a1a1a'
const CRIMSON = '#A51C30'

export default function ProFoundLogo({ size = 'md' }) {
  const { fontSize } = SIZES[size] ?? SIZES.md

  return (
    <span style={{
      fontFamily: FONT,
      fontSize,
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: '-0.02em',
      display: 'inline-flex',
      userSelect: 'none',
    }}>
      <span style={{ color: INK }}>Pro</span>
      <span style={{ color: CRIMSON }}>Found</span>
    </span>
  )
}
