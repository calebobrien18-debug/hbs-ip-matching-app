/**
 * import-enriched.mjs
 * ====================
 * Reads scripts/enriched_faculty.json (output from hbs_scraper.py) and
 * upserts research tags and publications into Supabase.
 *
 * Usage:
 *   node scripts/import-enriched.mjs
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
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
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Load enriched data ────────────────────────────────────────────────────────
const enrichedPath = join(__dirname, 'enriched_faculty.json')
let enriched
try {
  enriched = JSON.parse(readFileSync(enrichedPath, 'utf-8'))
} catch {
  console.error(`Could not read ${enrichedPath}`)
  console.error('Run python scripts/hbs_scraper.py first.')
  process.exit(1)
}

// ── Fetch faculty id map (hbs_fac_id → uuid) ──────────────────────────────────
const { data: facultyRows, error: fetchError } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id')

if (fetchError) {
  console.error('Failed to fetch faculty table:', fetchError.message)
  process.exit(1)
}

const facIdMap = Object.fromEntries(facultyRows.map(r => [r.hbs_fac_id, r.id]))

// ── Import ────────────────────────────────────────────────────────────────────
let totalTags = 0
let totalPubs = 0
let skipped   = 0

console.log('Importing enriched faculty data into Supabase…\n')

for (const record of enriched) {
  const facultyId = facIdMap[record.hbs_fac_id]

  if (!facultyId) {
    console.warn(`  ⚠  No faculty row found for hbs_fac_id=${record.hbs_fac_id} — skipping`)
    skipped++
    continue
  }

  // ── Upsert tags ──────────────────────────────────────────────────────────
  const tags = (record.tags ?? []).filter(t => t && t.trim().length > 1)
  if (tags.length > 0) {
    const tagRows = tags.map(tag => ({
      faculty_id: facultyId,
      tag:        tag.trim(),
      source:     'hbs',
    }))
    const { error: tagError } = await supabase
      .from('faculty_tags')
      .upsert(tagRows, { onConflict: 'faculty_id,tag' })

    if (tagError) {
      console.error(`  ✗ Tag insert error for ${record.hbs_fac_id}:`, tagError.message)
    } else {
      totalTags += tags.length
    }
  }

  // ── Upsert publications ───────────────────────────────────────────────────
  const pubs = (record.publications ?? []).filter(p => p.title && p.title.trim().length > 4)
  if (pubs.length > 0) {
    const pubRows = pubs.map(p => ({
      faculty_id: facultyId,
      title:      p.title.trim(),
      year:       p.year   ?? null,
      pub_type:   p.pub_type ?? null,
      journal:    p.journal?.trim() ?? null,
      url:        p.url    ?? null,
      source:     'hbs',
    }))
    const { error: pubError } = await supabase
      .from('faculty_publications')
      .insert(pubRows)  // insert (not upsert) — run script once per faculty

    if (pubError) {
      console.error(`  ✗ Publication insert error for ${record.hbs_fac_id}:`, pubError.message)
    } else {
      totalPubs += pubs.length
      console.log(`  ✓ ${record.hbs_fac_id}: ${tags.length} tags, ${pubs.length} pubs`)
    }
  } else {
    console.log(`  ✓ ${record.hbs_fac_id}: ${tags.length} tags, 0 pubs`)
  }
}

console.log('\n' + '='.repeat(50))
console.log(`✅ Import complete`)
console.log(`   Tags inserted:         ${totalTags}`)
console.log(`   Publications inserted: ${totalPubs}`)
if (skipped) console.log(`   Records skipped:       ${skipped}`)
