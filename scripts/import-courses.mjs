/**
 * import-courses.mjs
 * ===================
 * Reads scripts/courses.json (output from parse_course_catalog.py) and
 * upserts course records into Supabase, linking each to matching faculty
 * by name.
 *
 * Matching strategy:
 *   1. Normalize both names (lowercase, strip periods/commas)
 *   2. Exact normalized match
 *   3. Last-name-only match as fallback (logged as a warning)
 *
 * Usage:
 *   node scripts/import-courses.mjs
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.error('Could not read .env')
    process.exit(1)
  }
}

loadEnv()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Load courses.json ─────────────────────────────────────────────────────────
const coursesPath = join(__dirname, 'courses.json')
let courses
try {
  courses = JSON.parse(readFileSync(coursesPath, 'utf-8'))
} catch {
  console.error(`Could not read ${coursesPath}`)
  console.error('Run: python scripts/parse_course_catalog.py first')
  process.exit(1)
}

// ── Fetch faculty from Supabase ───────────────────────────────────────────────
const { data: facultyRows, error: fetchError } = await supabase
  .from('faculty')
  .select('id, name, unit')

if (fetchError) {
  console.error('Failed to fetch faculty:', fetchError.message)
  process.exit(1)
}

// Build name lookup maps
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lastName(name) {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1].toLowerCase().replace(/[.,]/g, '')
}

const byNormalizedName = new Map()
const byLastName       = new Map()  // last name → array of faculty (for fallback)

for (const fac of facultyRows) {
  const norm = normalizeName(fac.name)
  byNormalizedName.set(norm, fac)

  const last = lastName(fac.name)
  if (!byLastName.has(last)) byLastName.set(last, [])
  byLastName.get(last).push(fac)
}

function findFaculty(pdfName) {
  const norm = normalizeName(pdfName)

  // Exact match
  if (byNormalizedName.has(norm)) return { fac: byNormalizedName.get(norm), method: 'exact' }

  // Try without middle initial: "Eric J. Van den Steen" → "eric van den steen"
  const noInitial = norm.replace(/\b[a-z]\b\.?\s*/g, '').replace(/\s+/g, ' ').trim()
  if (byNormalizedName.has(noInitial)) return { fac: byNormalizedName.get(noInitial), method: 'no-initial' }

  // Check all db names with middle initial removed
  for (const [dbNorm, fac] of byNormalizedName) {
    const dbNoInitial = dbNorm.replace(/\b[a-z]\b\.?\s*/g, '').replace(/\s+/g, ' ').trim()
    if (dbNoInitial === noInitial) return { fac, method: 'no-initial-both' }
  }

  // Last name fallback (only if unambiguous)
  const last = lastName(pdfName)
  const candidates = byLastName.get(last) ?? []
  if (candidates.length === 1) return { fac: candidates[0], method: 'last-name' }

  return { fac: null, method: 'no-match' }
}

// ── Clear existing catalog courses and reimport ───────────────────────────────
console.log('Clearing existing hbs_catalog course records…')
const { error: deleteError } = await supabase
  .from('faculty_courses')
  .delete()
  .eq('source', 'hbs_catalog')

if (deleteError) {
  console.error('Delete error:', deleteError.message)
  process.exit(1)
}

// ── Build rows to insert ──────────────────────────────────────────────────────
console.log(`\nImporting ${courses.length} courses…\n`)

const rows    = []
let matched   = 0
let unmatched = 0

for (const course of courses) {
  for (const pdfName of course.faculty_names) {
    const { fac, method } = findFaculty(pdfName)

    if (!fac) {
      console.log(`  ✗ No match: "${pdfName}" (course: ${course.title.slice(0, 50)})`)
      unmatched++
      continue
    }

    if (method === 'last-name') {
      console.log(`  ~ Last-name match: "${pdfName}" → "${fac.name}"`)
    }

    rows.push({
      faculty_id:   fac.id,
      course_title: course.title,
      description:  course.description ?? null,
      unit:         fac.unit ?? null,   // use faculty's known unit
      term:         course.term ?? null,
      quarter:      course.quarter ?? null,
      credits:      course.credits ?? null,
      source:       'hbs_catalog',
    })
    matched++
  }
}

// ── Insert in batches ─────────────────────────────────────────────────────────
const BATCH = 50
let inserted = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('faculty_courses').insert(batch)
  if (error) {
    console.error(`  Batch error (rows ${i}–${i + batch.length}):`, error.message)
  } else {
    inserted += batch.length
  }
}

console.log('\n' + '='.repeat(50))
console.log('✅ Course import complete')
console.log(`   Courses parsed:       ${courses.length}`)
console.log(`   Faculty links matched: ${matched}`)
console.log(`   Faculty unmatched:     ${unmatched}`)
console.log(`   Rows inserted:         ${inserted}`)
