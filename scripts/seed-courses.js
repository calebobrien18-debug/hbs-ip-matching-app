/**
 * seed-courses.js
 * ================
 * CANONICAL seed script. Reads scripts/courses_data.json (output of
 * parse-courses.py) and seeds all courses into the faculty_courses table
 * with source = 'hbs_catalog_2026'.
 *
 * - Attempts to match each faculty name against the faculty table by name
 * - Sets faculty_id when a match is found; leaves it NULL otherwise
 * - faculty_name is always stored (raw string from catalog)
 * - Safe to re-run: deletes all existing hbs_catalog_2026 rows first
 * - Deduplicate key: (faculty_id, normalized_title, term, quarter)
 *   Requires migration 024 to be applied (drops old (faculty_id, course_title)
 *   unique constraint and replaces with (faculty_id, course_title, term, quarter)).
 *
 * Prerequisites:
 *   1. Apply migration 022 in Supabase SQL editor (if not done)
 *   2. Apply migration 024 in Supabase SQL editor (term-aware unique constraint)
 *   3. Run: python scripts/parse-courses.py
 *   4. Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage (from repo root):
 *   node scripts/seed-courses.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Name normalization for faculty matching ───────────────────────────────────

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\b(professor|dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lastName(name) {
  const parts = normalizeName(name).split(' ')
  return parts[parts.length - 1]
}

/**
 * Attempts to resolve a catalog faculty name string to a faculty UUID.
 * Tries exact normalized match first, then last-name-only match.
 * Returns null if no confident match found.
 */
function resolveFaculty(catalogName, facultyMap, lastNameMap) {
  if (!catalogName) return null

  const norm = normalizeName(catalogName)
  if (facultyMap.has(norm)) return facultyMap.get(norm)

  const last = lastName(catalogName)
  if (last.length > 3 && lastNameMap.has(last)) {
    const candidates = lastNameMap.get(last)
    // Only use last-name match if it's unambiguous (exactly one faculty)
    if (candidates.length === 1) return candidates[0].id
  }

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading courses_data.json…')
  const courses = JSON.parse(
    readFileSync(join(__dirname, 'courses_data.json'), 'utf-8')
  )
  console.log(`  ${courses.length} course entries loaded`)

  // Load all faculty from DB
  console.log('\nLoading faculty from DB…')
  const { data: facultyRows, error: facErr } = await supabase
    .from('faculty')
    .select('id, name')
  if (facErr) { console.error('Faculty load error:', facErr); process.exit(1) }
  console.log(`  ${facultyRows.length} faculty loaded`)

  // Build lookup maps
  const facultyMap  = new Map()  // normalized full name → id
  const lastNameMap = new Map()  // normalized last name → [{id, name}]

  for (const f of facultyRows) {
    const norm = normalizeName(f.name)
    facultyMap.set(norm, f.id)

    const last = lastName(f.name)
    if (!lastNameMap.has(last)) lastNameMap.set(last, [])
    lastNameMap.get(last).push(f)
  }

  // Delete existing catalog rows (safe re-run)
  console.log('\nDeleting existing hbs_catalog_2026 rows…')
  const { error: delErr } = await supabase
    .from('faculty_courses')
    .delete()
    .eq('source', 'hbs_catalog_2026')
  if (delErr) { console.error('Delete error:', delErr); process.exit(1) }
  console.log('  Done.')

  // Build rows to insert — one row per faculty per course
  const rows = []
  let matchedFacultyCount = 0
  let unmatchedNames = new Set()

  for (const course of courses) {
    const facultyList = course.faculty?.length ? course.faculty : [null]

    for (const rawName of facultyList) {
      const facultyId = rawName
        ? resolveFaculty(rawName, facultyMap, lastNameMap)
        : null

      if (rawName && !facultyId) unmatchedNames.add(rawName)
      if (facultyId) matchedFacultyCount++

      rows.push({
        faculty_id:    facultyId,
        faculty_name:  rawName ?? null,
        course_title:  (course.title ?? '').trim(),
        course_number: course.course_number ?? null,
        description:   course.description ?? null,
        unit:          course.area ?? null,
        term:          course.term ?? null,
        quarter:       course.quarter ?? null,
        credits:       course.credits ?? null,
        source:        'hbs_catalog_2026',
      })
    }
  }

  console.log(`\nPrepared ${rows.length} rows (${matchedFacultyCount} with resolved faculty_id)`)

  // Deduplicate: key is (faculty_id, normalized_title, term, quarter).
  // This preserves distinct offerings of the same course across different terms/quarters.
  // Requires migration 024 (unique constraint updated to include term+quarter).
  // When two rows share the same key, keep the one with the longest description.
  const deduped = new Map()
  for (const row of rows) {
    const normTitle = (row.course_title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = `${row.faculty_id ?? 'null'}||${normTitle}||${row.term ?? ''}||${row.quarter ?? ''}`
    const existing = deduped.get(key)
    if (!existing || (row.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      deduped.set(key, row)
    }
  }
  const dedupedRows = [...deduped.values()]
  if (dedupedRows.length < rows.length) {
    console.log(`  Deduplicated ${rows.length - dedupedRows.length} exact-duplicate rows (same faculty+title+term+quarter)`)
  }

  // Log suspicious course records for review
  const suspiciousRecords = dedupedRows.filter(r =>
    !r.term || r.course_title.length > 100 || !r.description
  )
  if (suspiciousRecords.length > 0) {
    console.log(`\n⚠  ${suspiciousRecords.length} course records may need review (run parse-courses.py QA output for details):`)
    for (const r of suspiciousRecords.slice(0, 8)) {
      const flags = []
      if (!r.term) flags.push('no term')
      if (r.course_title.length > 100) flags.push(`title ${r.course_title.length} chars`)
      if (!r.description) flags.push('no description')
      console.log(`  [${flags.join(', ')}] ${r.course_title.slice(0, 70)}`)
    }
    if (suspiciousRecords.length > 8) {
      console.log(`  … and ${suspiciousRecords.length - 8} more`)
    }
  }

  if (unmatchedNames.size > 0) {
    console.log(`\nFaculty names NOT matched to DB (${unmatchedNames.size}):`)
    for (const name of [...unmatchedNames].sort()) {
      console.log(`  • ${name}`)
    }
  }

  // Insert in batches of 200
  console.log('\nInserting rows…')
  const BATCH = 200
  let inserted = 0

  for (let i = 0; i < dedupedRows.length; i += BATCH) {
    const batch = dedupedRows.slice(i, i + BATCH)
    const { error: insertErr } = await supabase
      .from('faculty_courses')
      .insert(batch)
    if (insertErr) {
      console.error(`Insert error at batch ${i}:`, insertErr)
      process.exit(1)
    }
    inserted += batch.length
    process.stdout.write(`\r  Inserted ${inserted}/${dedupedRows.length}…`)
  }

  console.log(`\n\n✓ Seeding complete — ${dedupedRows.length} rows inserted into faculty_courses`)
  console.log(`  Courses with linked faculty_id: ${matchedFacultyCount}`)
  console.log(`  Courses without faculty match: ${unmatchedNames.size} unique names`)
}

main().catch(err => { console.error(err); process.exit(1) })
