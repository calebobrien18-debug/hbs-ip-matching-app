// ── Match strength display ─────────────────────────────────────────────────────

/** Chip background/text colors for match strength badges. */
export const STRENGTH_STYLES = {
  strong:      'bg-green-700 text-white',
  good:        'bg-green-100 text-green-800 border border-green-300',
  exploratory: 'bg-green-50 text-green-600 border border-green-200',
}

/** Left-border accent colors for match strength cards. */
export const STRENGTH_ACCENT = {
  strong:      'border-l-green-600',
  good:        'border-l-green-400',
  exploratory: 'border-l-green-200',
}

/** Human-readable labels for match strength values. */
export const STRENGTH_LABELS = {
  strong:      'Strong match',
  good:        'Good match',
  exploratory: 'Exploratory',
}

// ── Rate limits ────────────────────────────────────────────────────────────────

/** Maximum match runs per user per UTC calendar day. */
export const DAILY_LIMIT = 3

/** Maximum email drafts per user per UTC calendar day. */
export const EMAIL_DAILY_LIMIT = 10
