/**
 * ProFound wordmark
 *
 * Default (light bg): "Pro" in charcoal · "Found" in crimson
 * light=true (dark bg): "Pro" in white · "Found" in white/65
 * Single bold sans-serif word, no icon.
 *
 * Props:
 *   size  — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 *   light — true when rendered on a dark/crimson background
 */

const FONT = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const SIZES = {
  sm: { fontSize: '1.05rem' },
  md: { fontSize: '1.5rem'  },
  lg: { fontSize: '4.5rem'  },
}

const COLORS = {
  dark:  { pro: '#1a1a1a',               found: '#A51C30'              },
  light: { pro: 'rgba(255,255,255,1)',    found: 'rgba(255,255,255,0.65)' },
}

export default function ProFoundLogo({ size = 'md', light = false }) {
  const { fontSize } = SIZES[size] ?? SIZES.md
  const { pro, found } = light ? COLORS.light : COLORS.dark

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
      <span style={{ color: pro }}>Pro</span>
      <span style={{ color: found }}>Found</span>
    </span>
  )
}
