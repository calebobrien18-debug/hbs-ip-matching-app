/**
 * import-faculty-directory.mjs
 * =============================
 * Reads scripts/all_faculty.json (output from scrape_faculty_directory.py)
 * and upserts basic faculty rows into Supabase.
 *
 * Safe to re-run: uses ON CONFLICT (hbs_fac_id) DO NOTHING so existing
 * pilot faculty (with richer hand-curated data) are never overwritten.
 *
 * Usage:
 *   node scripts/import-faculty-directory.mjs
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env manually ────────────────────────────────────────────────────────
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
    console.error('Could not read .env — make sure it exists at the project root.')
    process.exit(1)
  }
}

loadEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Load directory data ───────────────────────────────────────────────────────
const directoryPath = join(__dirname, 'all_faculty.json')
let allFaculty
try {
  allFaculty = JSON.parse(readFileSync(directoryPath, 'utf-8'))
} catch {
  console.error(`Could not read ${directoryPath}`)
  console.error('Run python scripts/scrape_faculty_directory.py first.')
  process.exit(1)
}

// ── Fetch existing hbs_fac_ids to count skips vs inserts ─────────────────────
const { data: existing, error: fetchError } = await supabase
  .from('faculty')
  .select('hbs_fac_id')

if (fetchError) {
  console.error('Failed to fetch existing faculty:', fetchError.message)
  process.exit(1)
}

const existingIds = new Set((existing ?? []).map(r => r.hbs_fac_id))

// ── Upsert in batches ─────────────────────────────────────────────────────────
console.log(`Importing ${allFaculty.length} faculty from directory…\n`)

const BATCH_SIZE = 50
let inserted = 0
let skipped  = 0
let errors   = 0

// Separate new vs existing
const newRows = allFaculty
  .filter(f => f.hbs_fac_id && f.name)
  .filter(f => !existingIds.has(f.hbs_fac_id))
  .map(f => ({
    hbs_fac_id:  f.hbs_fac_id,
    name:        f.name.trim(),
    unit:        f.unit?.trim() ?? null,
    profile_url: f.profile_url ?? null,
  }))

skipped = allFaculty.length - newRows.length

// Insert in batches
for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
  const batch = newRows.slice(i, i + BATCH_SIZE)
  const { error } = await supabase
    .from('faculty')
    .insert(batch)

  if (error) {
    console.error(`  ✗ Batch insert error (rows ${i}–${i + batch.length}):`, error.message)
    errors += batch.length
  } else {
    inserted += batch.length
    console.log(`  ✓ Inserted rows ${i + 1}–${i + batch.length}`)
  }
}

console.log('\n' + '='.repeat(50))
console.log('✅ Faculty directory import complete')
console.log(`   New faculty inserted: ${inserted}`)
console.log(`   Already existed (skipped): ${skipped}`)
if (errors) console.log(`   Errors: ${errors}`)
console.log('\nNext step: python scripts/hbs_scraper.py')
