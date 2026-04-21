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

/**
 * Conservative display-side sanitizer for course descriptions.
 * Trims obvious metadata blobs at render time as a backstop against
 * parser artifacts reaching the UI. The primary fix is upstream in
 * the parser (parse-courses.py).
 */
export function sanitizeDescription(desc) {
  if (!desc) return null
  const cutIdx = desc.search(
    /\b(Enrollment\s*:|Course\s+Format\b|Grading\s*\/|Educational\s+Objectives?|Course\s+Content\s+Keywords?)\b/i
  )
  if (cutIdx > 40) desc = desc.slice(0, cutIdx).trim()
  desc = desc.replace(
    /^\s*(Exam|Paper|Project|Participation|Assignment)(\s+(or|and)\s+(Exam|Paper|Project|Participation|Assignment))*\s+/i,
    ''
  )
  return desc.length >= 20 ? desc.trim() : null
}

/**
 * Groups raw faculty_courses rows into one display object per logical offering.
 *
 * The catalog seed inserts one row per faculty per course, so team-taught courses
 * and same-course-different-rows produce duplicates. This function collapses them.
 *
 * Grouping key: course_number + term + quarter (preferred), falling back to
 * normalized title + term + quarter when course_number is absent.
 *
 * Within each group:
 * - `id` is set to the first row's id (representative for saved_courses semantics)
 * - `description` keeps the longest non-null value across rows
 * - `faculty` aggregates unique faculty members
 *
 * Note on save semantics: saved_courses.course_id points to a specific
 * faculty_courses.id. We use the first row's id as the representative.
 * This is an intentional interim simplification; a proper fix would require
 * a separate courses table.
 */
export function groupCourseRows(rows) {
  const groups = new Map()

  for (const row of rows) {
    const normTitle = (row.course_title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = row.course_number
      ? `num:${row.course_number}|${row.term ?? ''}|${row.quarter ?? ''}`
      : `title:${normTitle}|${row.term ?? ''}|${row.quarter ?? ''}`

    if (!groups.has(key)) {
      groups.set(key, {
        id:            row.id,
        course_title:  row.course_title ?? '',
        course_number: row.course_number ?? null,
        unit:          row.unit ?? null,
        term:          row.term ?? null,
        quarter:       row.quarter ?? null,
        credits:       row.credits ?? null,
        description:   row.description ?? null,
        faculty:       [],
      })
    }

    const g = groups.get(key)

    // Keep the longest description across rows in this group
    if ((row.description?.length ?? 0) > (g.description?.length ?? 0)) {
      g.description = row.description
    }

    // Aggregate unique faculty members (prefer joined faculty record over raw name)
    const facId   = row.faculty?.id ?? null
    const facName = row.faculty?.name ?? row.faculty_name ?? null
    if (facName && !g.faculty.some(f => f.id === facId && f.name === facName)) {
      g.faculty.push({
        id:        facId,
        name:      facName,
        image_url: row.faculty?.image_url ?? null,
      })
    }
  }

  return [...groups.values()]
}
