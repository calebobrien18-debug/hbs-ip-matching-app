/** Returns 1-2 uppercase initials from a display name. */
export function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
