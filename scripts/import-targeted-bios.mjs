/**
 * import-targeted-bios.mjs
 * =========================
 * Reads scripts/enriched_faculty_targeted.json (output from a FILTER_IDS
 * scraper run) and patches only the `bio` column for those faculty.
 * All other columns (title, email, unit, publications, tags) are left alone.
 *
 * Usage:
 *   node scripts/import-targeted-bios.mjs
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const targetedPath = join(__dirname, 'enriched_faculty_targeted.json')
let targeted
try {
  targeted = JSON.parse(readFileSync(targetedPath, 'utf-8'))
} catch {
  console.error(`Could not read ${targetedPath}`)
  console.error('Run the scraper with FILTER_IDS set first.')
  process.exit(1)
}

// Fetch id map for only the targeted hbs_fac_ids
const hbsIds = targeted.map(r => r.hbs_fac_id)
const { data: rows, error: fetchErr } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id, name')
  .in('hbs_fac_id', hbsIds)

if (fetchErr) {
  console.error('Failed to fetch faculty rows:', fetchErr.message)
  process.exit(1)
}

const idMap = Object.fromEntries(rows.map(r => [r.hbs_fac_id, { id: r.id, name: r.name }]))

console.log('Patching bio for targeted faculty…\n')

let updated = 0
let skipped = 0
let nulled  = 0

for (const record of targeted) {
  const fac = idMap[record.hbs_fac_id]
  if (!fac) {
    console.warn(`  SKIP  hbs_fac_id=${record.hbs_fac_id} — not found in DB`)
    skipped++
    continue
  }

  const bio = record.bio?.trim() || null

  const { error } = await supabase
    .from('faculty')
    .update({ bio })
    .eq('id', fac.id)

  if (error) {
    console.error(`  ERROR ${fac.name} (${record.hbs_fac_id}): ${error.message}`)
  } else if (bio) {
    console.log(`  OK    ${fac.name} → ${bio.slice(0, 80)}…`)
    updated++
  } else {
    console.log(`  NULL  ${fac.name} — no bio found in scrape`)
    nulled++
  }
}

console.log(`\nDone: ${updated} updated, ${nulled} set to null, ${skipped} skipped.`)
