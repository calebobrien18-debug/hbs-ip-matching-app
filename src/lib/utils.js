/** Returns 1-2 uppercase initials from a display name. */
export function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

/** Returns the last word of a display name for alphabetical sorting. */
export function lastName(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1]
}

const NAV_PHRASES = [
  'Faculty & Research', 'Baker Library', 'Harvard Business Review',
  'Academic Programs', 'Map & Directions', 'Soldiers Field', 'Site Map',
]

/**
 * Returns true when a bio string is actually HBS page navigation/chrome
 * accidentally captured by the scraper (2+ fingerprint phrases present).
 */
export function isNavContent(text) {
  if (!text) return false
  return NAV_PHRASES.filter(p => text.includes(p)).length >= 2
}
