/**
 * import-enriched.mjs
 * ====================
 * Reads scripts/enriched_faculty.json (output from hbs_scraper.py) and
 * upserts photos, research tags, and publications into Supabase.
 *
 * Safe to re-run: publications are deleted then re-inserted per faculty,
 * tags are upserted, and photos only update if no image_url already set.
 *
 * Usage:
 *   node scripts/import-enriched.mjs
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
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

// ── Fetch faculty id map (hbs_fac_id → {id, image_url}) ──────────────────────
const { data: facultyRows, error: fetchError } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id, image_url')

if (fetchError) {
  console.error('Failed to fetch faculty table:', fetchError.message)
  process.exit(1)
}

const facMap = Object.fromEntries(
  facultyRows.map(r => [r.hbs_fac_id, { id: r.id, image_url: r.image_url }])
)

// ── Import ────────────────────────────────────────────────────────────────────
let totalPhotos = 0
let totalTags   = 0
let totalPubs   = 0
let skipped     = 0

console.log('Importing enriched faculty data into Supabase…\n')

for (const record of enriched) {
  const fac = facMap[record.hbs_fac_id]

  if (!fac) {
    console.warn(`  ⚠  No faculty row found for hbs_fac_id=${record.hbs_fac_id} — skipping`)
    skipped++
    continue
  }

  const facultyId = fac.id

  // ── Photo: only set if not already populated ──────────────────────────────
  if (record.photo_url && !fac.image_url) {
    const { error: photoError } = await supabase
      .from('faculty')
      .update({ image_url: record.photo_url })
      .eq('id', facultyId)

    if (photoError) {
      console.error(`  ✗ Photo update error for ${record.hbs_fac_id}:`, photoError.message)
    } else {
      totalPhotos++
    }
  }

  // ── Tags: upsert (safe to re-run) ────────────────────────────────────────
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

  // ── Publications: delete existing hbs-sourced rows, then re-insert ────────
  // This makes the script idempotent — safe to re-run after scraper improvements.
  const pubs = (record.publications ?? []).filter(p => p.title && p.title.trim().length > 4)

  await supabase
    .from('faculty_publications')
    .delete()
    .eq('faculty_id', facultyId)
    .eq('source', 'hbs')

  if (pubs.length > 0) {
    const pubRows = pubs.map(p => ({
      faculty_id: facultyId,
      title:      p.title.trim(),
      year:       p.year     ?? null,
      pub_type:   p.pub_type ?? null,
      journal:    p.journal?.trim() ?? null,
      url:        p.url      ?? null,
      source:     'hbs',
    }))
    const { error: pubError } = await supabase
      .from('faculty_publications')
      .insert(pubRows)

    if (pubError) {
      console.error(`  ✗ Publication insert error for ${record.hbs_fac_id}:`, pubError.message)
    } else {
      totalPubs += pubs.length
    }
  }

  const photoMark = (record.photo_url && !fac.image_url) ? '📷' : (record.photo_url ? '(photo exists)' : '--')
  console.log(`  ✓ ${record.hbs_fac_id}: photo=${photoMark}  tags=${tags.length}  pubs=${pubs.length}`)
}

console.log('\n' + '='.repeat(50))
console.log(`✅ Import complete`)
console.log(`   Photos updated:        ${totalPhotos}`)
console.log(`   Tags inserted:         ${totalTags}`)
console.log(`   Publications inserted: ${totalPubs}`)
if (skipped) console.log(`   Records skipped:       ${skipped}`)
