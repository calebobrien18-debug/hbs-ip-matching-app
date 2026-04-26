/**
 * audit-faculty-data.mjs
 * =======================
 * Read-only audit of faculty unit and bio fields in Supabase.
 *
 * Classifies issues into two confidence tiers:
 *   HIGH  — clear artifact pattern or structural contradiction; safe to auto-fix
 *   REVIEW — weak signal; needs human eyes before any change
 *
 * Usage:
 *   node scripts/audit-faculty-data.mjs            # human-readable console report
 *   node scripts/audit-faculty-data.mjs --json     # machine-readable JSON to stdout
 *
 * Pipe JSON output into the fix script:
 *   node scripts/audit-faculty-data.mjs --json > audit-results.json
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const JSON_MODE = process.argv.includes('--json')

// ── Env loading (matches import-enriched.mjs) ─────────────────────────────────
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

// For bio-text matching: also accept "and" spelling of &
function unitVariants(unit) {
  return [unit, unit.replace(' & ', ' and ')]
}

// ── Bio heuristics ────────────────────────────────────────────────────────────

const PUB_PATTERNS = [
  { id: 'view_details',   re: /View Details/g,        label: 'Contains "View Details" (publication artifact)' },
  { id: 'eds_abbrev',     re: /\bEds?\.\b/g,           label: 'Contains editor abbreviation (Eds./Ed.)' },
  { id: 'et_al',          re: /\bet al\b/gi,           label: 'Contains "et al" (multi-author citation)' },
]

function countMatches(text, re) {
  return (text.match(re) || []).length
}

/**
 * Returns an array of issue objects for the bio field.
 * Each issue has: { id, label, confidence: 'HIGH' | 'REVIEW' }
 */
function auditBio(bio) {
  if (!bio || !bio.trim()) {
    return [{ id: 'no_bio', label: 'No bio stored', confidence: 'HIGH' }]
  }

  const issues = []

  // HIGH confidence: multiple strong publication artifact signals
  let artifactHits = 0
  for (const p of PUB_PATTERNS) {
    if (p.re.test(bio)) {
      artifactHits++
    }
  }
  if (artifactHits >= 2) {
    issues.push({ id: 'pub_artifact', label: `Bio contains ${artifactHits} publication artifact signals (Eds., et al., View Details)`, confidence: 'HIGH' })
  } else if (artifactHits === 1) {
    issues.push({ id: 'pub_artifact_weak', label: 'Bio contains one publication artifact signal', confidence: 'REVIEW' })
  }

  // HIGH: repeated "View Details" — almost never in a real bio
  const viewDetailsCount = countMatches(bio, /View Details/g)
  if (viewDetailsCount >= 2) {
    issues.push({ id: 'view_details_repeat', label: `"View Details" appears ${viewDetailsCount} times — likely citation block`, confidence: 'HIGH' })
  }

  // HIGH: year density overwhelms sentences
  const yearCount = (bio.match(/\b(19|20)\d{2}\b/g) || []).length
  const sentenceCount = (bio.match(/[.!?]\s+[A-Z]/g) || []).length
  if (yearCount > 5 && yearCount > sentenceCount) {
    issues.push({ id: 'year_overload', label: `Year citations (${yearCount}) exceed sentence transitions (${sentenceCount}) — likely publication list`, confidence: 'HIGH' })
  }

  // REVIEW: very short bio
  if (bio.length < 150) {
    issues.push({ id: 'too_short', label: `Bio is very short (${bio.length} chars)`, confidence: 'REVIEW' })
  }

  return issues
}

/**
 * Returns an array of issue objects for the unit field.
 * Each issue has: { id, label, confidence, suspected_unit? }
 */
function auditUnit(row) {
  const issues = []

  if (!row.unit || !row.unit.trim()) {
    issues.push({ id: 'no_unit', label: 'No unit stored', confidence: 'HIGH' })
    return issues
  }

  if (!CANONICAL_UNITS.has(row.unit)) {
    issues.push({ id: 'noncanonical_unit', label: `Non-canonical unit value: "${row.unit}"`, confidence: 'HIGH' })
  }

  // Cross-check against bio text: look for "X Unit" or "in the X" phrasing
  if (row.bio) {
    for (const unit of CANONICAL_UNITS) {
      if (unit === row.unit) continue
      const variants = unitVariants(unit)
      const pattern = new RegExp(
        `(?:${variants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}).{0,40}Unit\\b`,
        'i',
      )
      if (pattern.test(row.bio)) {
        issues.push({
          id: 'unit_bio_mismatch',
          label: `Bio explicitly mentions "${unit}" as a unit, but stored unit is "${row.unit}"`,
          confidence: 'REVIEW',
          suspected_unit: unit,
        })
      }
    }
  }

  return issues
}

// ── Paginated fetch ───────────────────────────────────────────────────────────

async function fetchAllFaculty() {
  const PAGE_SIZE = 1000
  let all = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('faculty')
      .select('id, hbs_fac_id, name, unit, bio, title, profile_url')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('name')
    if (error) {
      console.error('Fetch error:', error.message)
      process.exit(1)
    }
    all = all.concat(data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rows = await fetchAllFaculty()
if (!JSON_MODE) console.error(`Auditing ${rows.length} faculty records…\n`)

const suspects = []

for (const row of rows) {
  const bioIssues  = auditBio(row.bio)
  const unitIssues = auditUnit(row)
  const allIssues  = [...bioIssues, ...unitIssues]

  if (allIssues.length === 0) continue

  const highCount   = allIssues.filter(i => i.confidence === 'HIGH').length
  const suspected_unit = unitIssues.find(i => i.suspected_unit)?.suspected_unit ?? null

  suspects.push({
    hbs_fac_id:     row.hbs_fac_id,
    name:           row.name,
    stored_unit:    row.unit ?? null,
    bio_length:     row.bio ? row.bio.length : 0,
    profile_url:    row.profile_url ?? null,
    issues:         allIssues,
    high_count:     highCount,
    suspected_unit,
  })
}

if (JSON_MODE) {
  // Machine-readable output — safe to pipe
  console.log(JSON.stringify(suspects, null, 2))
} else {
  const total = rows.length
  const highSuspects = suspects.filter(s => s.high_count > 0)
  const reviewSuspects = suspects.filter(s => s.high_count === 0)

  console.log('='.repeat(64))
  console.log(`FACULTY DATA QUALITY AUDIT  —  ${new Date().toLocaleDateString()}`)
  console.log(`${suspects.length} suspect records out of ${total} total`)
  console.log(`  HIGH confidence:   ${highSuspects.length}`)
  console.log(`  REVIEW needed:     ${reviewSuspects.length}`)
  console.log('='.repeat(64) + '\n')

  const printGroup = (label, group) => {
    if (group.length === 0) return
    console.log(`── ${label} (${group.length}) ` + '─'.repeat(Math.max(0, 54 - label.length)))
    for (const s of group) {
      console.log(`\n[${s.hbs_fac_id}] ${s.name}`)
      console.log(`  Stored unit:  ${s.stored_unit ?? '(none)'}`)
      if (s.suspected_unit) console.log(`  Suspected:    ${s.suspected_unit}`)
      console.log(`  Bio length:   ${s.bio_length} chars`)
      for (const issue of s.issues) {
        const marker = issue.confidence === 'HIGH' ? '✗' : '?'
        console.log(`  [${marker}] ${issue.label}`)
      }
    }
    console.log()
  }

  printGroup('HIGH CONFIDENCE', highSuspects)
  printGroup('NEEDS REVIEW', reviewSuspects)

  // Issue frequency summary
  const counts = {}
  for (const s of suspects) s.issues.forEach(i => { counts[i.id] = (counts[i.id] || 0) + 1 })
  console.log('─'.repeat(64))
  console.log('Issue frequency:')
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([id, n]) => {
    console.log(`  ${String(n).padStart(3)}  ${id}`)
  })
  console.log()
  console.log('To export for repair:')
  console.log('  node scripts/audit-faculty-data.mjs --json > audit-results.json')
}
