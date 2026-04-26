/**
 * fix-faculty-unit-bio.mjs
 * =========================
 * Cautious repair script for faculty unit and bio fields in Supabase.
 *
 * SAFETY RULES
 *   - Auto-applies unit changes only when scraper found exactly one canonical
 *     unit via /faculty/units/ structural links (unit_confidence === 'HIGH').
 *   - Auto-applies bio changes only when current bio is clearly bad AND new bio
 *     is clean narrative (bio_confidence === 'HIGH').
 *   - Never overwrites a plausible narrative bio based on heuristics alone.
 *   - Skips no-op records (unchanged values).
 *   - Logs every proposed write with before/after values and evidence.
 *   - Exports a pre-write snapshot (backup) before any mutations.
 *
 * Modes:
 *   --from-rescrape <file.json>   Apply HIGH-confidence fixes from re-scrape output
 *   --input         <file.json>   Apply manually-curated corrections
 *   --dry-run                     Print proposed changes without writing
 *
 * Input schema for --from-rescrape (output of re-scrape-flagged-faculty.mjs):
 *   [{ hbs_fac_id, scraped: { unit?, bio? }, unit_confidence, bio_confidence }, ...]
 *
 * Input schema for --input (manual corrections):
 *   [{ hbs_fac_id, unit?, bio?, reason? }, ...]
 *   Omit a field to leave it unchanged.
 *
 * Usage:
 *   node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json --dry-run
 *   node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json
 *   node scripts/fix-faculty-unit-bio.mjs --input corrections.json --dry-run
 *   node scripts/fix-faculty-unit-bio.mjs --input corrections.json
 */

import { createClient }                       from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath }                      from 'url'
import { dirname, join }                      from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN   = process.argv.includes('--dry-run')

// ── Env loading ───────────────────────────────────────────────────────────────
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

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── Canonical unit list ───────────────────────────────────────────────────────
const CANONICAL_UNITS = new Set([
  'Accounting & Management',
  'Business, Government & International Economy',
  'Entrepreneurial Management',
  'Finance',
  'General Management',
  'Marketing',
  'Negotiation, Organizations & Markets',
  'Organizational Behavior',
  'Strategy',
  'Technology & Operations Management',
])

// ── Parse mode and load corrections ──────────────────────────────────────────
let corrections = []   // [{ hbs_fac_id, unit?, bio?, reason, source }]

const rescrapeFlag = process.argv.indexOf('--from-rescrape')
const inputFlag    = process.argv.indexOf('--input')

if (rescrapeFlag !== -1 && process.argv[rescrapeFlag + 1]) {
  // Re-scrape mode: only apply HIGH-confidence changes
  const path = process.argv[rescrapeFlag + 1]
  let report
  try {
    report = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    console.error(`Could not read ${path}:`, err.message)
    process.exit(1)
  }

  for (const r of report) {
    const entry = { hbs_fac_id: String(r.hbs_fac_id), source: 'rescrape', reason: '' }
    const parts = []

    if (r.unit_confidence === 'HIGH' && r.scraped?.unit && CANONICAL_UNITS.has(r.scraped.unit)) {
      entry.unit = r.scraped.unit
      parts.push(`unit → "${r.scraped.unit}" (HIGH confidence from /faculty/units/ structural link)`)
    }
    if (r.bio_confidence === 'HIGH' && r.scraped?.bio?.trim()) {
      entry.bio = r.scraped.bio.trim()
      parts.push(`bio updated (${entry.bio.length} chars, HIGH confidence: current was bad + new is clean)`)
    }

    if (parts.length > 0) {
      entry.reason = parts.join('; ')
      corrections.push(entry)
    }
  }

  console.log(`Loaded ${report.length} re-scrape records; ${corrections.length} HIGH-confidence corrections to apply.`)

} else if (inputFlag !== -1 && process.argv[inputFlag + 1]) {
  // Manual corrections mode
  const path = process.argv[inputFlag + 1]
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    console.error(`Could not read ${path}:`, err.message)
    process.exit(1)
  }

  corrections = raw.map(r => ({
    hbs_fac_id: String(r.hbs_fac_id),
    unit:        r.unit ?? undefined,
    bio:         r.bio  ?? undefined,
    reason:      r.reason ?? '(manual correction)',
    source:      'manual',
  }))

  console.log(`Loaded ${corrections.length} manual corrections from ${path}`)

} else {
  console.error('Usage:')
  console.error('  node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json [--dry-run]')
  console.error('  node scripts/fix-faculty-unit-bio.mjs --input corrections.json [--dry-run]')
  process.exit(1)
}

if (corrections.length === 0) {
  console.log('No corrections to apply. Exiting.')
  process.exit(0)
}

// ── Fetch current DB values for all faculty ───────────────────────────────────
const { data: dbRows, error: fetchError } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id, name, unit, bio, profile_url')

if (fetchError) {
  console.error('DB fetch error:', fetchError.message)
  process.exit(1)
}

const dbMap = Object.fromEntries(dbRows.map(r => [r.hbs_fac_id, r]))

// ── Pre-write snapshot (rollback protection) ──────────────────────────────────
const targetIds = new Set(corrections.map(c => c.hbs_fac_id))
const rowsToSnapshot = dbRows.filter(r => targetIds.has(r.hbs_fac_id))

if (!DRY_RUN && rowsToSnapshot.length > 0) {
  const backupDir = join(__dirname, '..', 'backups')
  mkdirSync(backupDir, { recursive: true })
  const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outPath = join(backupDir, `faculty-unit-bio-backup-${ts}.json`)
  const snapshot = rowsToSnapshot.map(r => ({
    id:           r.id,
    hbs_fac_id:   r.hbs_fac_id,
    name:         r.name,
    unit:         r.unit,
    bio:          r.bio,
    profile_url:  r.profile_url,
    backed_up_at: new Date().toISOString(),
  }))
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2))
  console.log(`\nBackup saved: ${outPath}  (${snapshot.length} rows)`)
}

// ── Apply corrections ─────────────────────────────────────────────────────────
console.log(DRY_RUN ? '\n=== DRY RUN — no writes will occur ===' : '\n=== Applying corrections ===')
console.log()

let updated = 0
let skipped = 0
let errors  = 0

for (const correction of corrections) {
  const fac = dbMap[correction.hbs_fac_id]

  if (!fac) {
    console.warn(`  ⚠  No DB row found for hbs_fac_id=${correction.hbs_fac_id} — skipping`)
    skipped++
    continue
  }

  const patch   = {}
  const changes = []

  // Unit
  if (correction.unit !== undefined) {
    if (!CANONICAL_UNITS.has(correction.unit)) {
      console.warn(`  ⚠  Non-canonical unit "${correction.unit}" for ${fac.name} — skipping unit field`)
    } else if (correction.unit === fac.unit) {
      // no-op
    } else {
      patch.unit = correction.unit
      changes.push(`unit: "${fac.unit ?? '(none)'}" → "${correction.unit}"`)
    }
  }

  // Bio
  if (correction.bio !== undefined) {
    const newBio = correction.bio.trim()
    if (!newBio) {
      console.warn(`  ⚠  Empty bio in correction for ${fac.name} — skipping bio field`)
    } else if (newBio === (fac.bio ?? '').trim()) {
      // no-op
    } else {
      patch.bio = newBio
      const oldSnip = (fac.bio ?? '').slice(0, 60).replace(/\n/g, ' ')
      const newSnip = newBio.slice(0, 60).replace(/\n/g, ' ')
      changes.push(`bio: "${oldSnip}…" → "${newSnip}…" (${newBio.length} chars)`)
    }
  }

  if (Object.keys(patch).length === 0) {
    console.log(`  – ${fac.name} (${correction.hbs_fac_id}): no change needed`)
    skipped++
    continue
  }

  console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}${fac.name} (${correction.hbs_fac_id})`)
  for (const ch of changes) console.log(`    ${ch}`)
  console.log(`    Reason: ${correction.reason}`)

  if (!DRY_RUN) {
    const { error } = await supabase
      .from('faculty')
      .update(patch)
      .eq('id', fac.id)

    if (error) {
      console.error(`    ✗ DB error: ${error.message}`)
      errors++
    } else {
      console.log(`    ✓ Written`)
      updated++
    }
  } else {
    updated++
  }

  console.log()
}

console.log('='.repeat(56))
if (DRY_RUN) {
  console.log(`DRY RUN complete — no writes made`)
  console.log(`  Would update:  ${updated}`)
  console.log(`  Would skip:    ${skipped}`)
} else {
  console.log(`✅ Done`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Skipped:  ${skipped}`)
  if (errors) console.log(`  Errors:   ${errors}`)
}
