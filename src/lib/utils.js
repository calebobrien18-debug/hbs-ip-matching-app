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
