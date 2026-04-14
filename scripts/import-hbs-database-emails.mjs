/**
 * import-hbs-database-emails.mjs
 * ================================
 * Fetches faculty.json from github.com/nbtcub11/hbs-database and uses it
 * to backfill email addresses for faculty who don't have one yet.
 *
 * Matching is done by normalized name (lowercase, punctuation stripped).
 * Only updates rows where email is currently null/empty.
 *
 * Usage:
 *   node scripts/import-hbs-database-emails.mjs
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

// ── Fetch faculty.json from GitHub ────────────────────────────────────────────
const RAW_URL = 'https://raw.githubusercontent.com/nbtcub11/hbs-database/main/data/faculty.json'

console.log('Fetching faculty.json from hbs-database repo…')
let sourceData
try {
  const res = await fetch(RAW_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  sourceData = await res.json()
} catch (err) {
  console.error('Failed to fetch faculty.json:', err.message)
  process.exit(1)
}

console.log(`  ${sourceData.length} records found in source\n`)

// ── Normalize name for fuzzy matching ────────────────────────────────────────
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.\-,]/g, ' ')   // treat punctuation as spaces
    .replace(/\s+/g, ' ')
    .trim()
}

// Build lookup: normalized name → email
const emailByName = {}
for (const row of sourceData) {
  if (row.name && row.email) {
    emailByName[normalizeName(row.name)] = row.email.trim().toLowerCase()
  }
}

// ── Fetch our faculty (those without an email) ────────────────────────────────
const { data: facultyRows, error } = await supabase
  .from('faculty')
  .select('id, name, email')

if (error) {
  console.error('Failed to fetch faculty:', error.message)
  process.exit(1)
}

const missing = facultyRows.filter(f => !f.email)
console.log(`Faculty without email: ${missing.length} of ${facultyRows.length}\n`)

// ── Match and update ──────────────────────────────────────────────────────────
let updated = 0
let noMatch = 0

for (const fac of missing) {
  const key = normalizeName(fac.name)
  const email = emailByName[key]

  if (!email) {
    noMatch++
    continue
  }

  const { error: updateError } = await supabase
    .from('faculty')
    .update({ email })
    .eq('id', fac.id)

  if (updateError) {
    console.error(`  ✗ ${fac.name}:`, updateError.message)
  } else {
    console.log(`  ✓ ${fac.name} → ${email}`)
    updated++
  }
}

console.log('\n' + '='.repeat(50))
console.log('✅ Email backfill complete')
console.log(`   Updated:   ${updated}`)
console.log(`   No match:  ${noMatch}`)
