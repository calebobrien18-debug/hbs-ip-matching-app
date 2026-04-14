/**
 * apply-manual-merges.mjs
 * ========================
 * Applies a hand-curated set of tag merges that were reviewed and approved
 * after the automated consolidation pass. Rewrites tags-master.json when done.
 *
 * Usage:
 *   node scripts/apply-manual-merges.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN   = process.argv.includes('--dry-run')

function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* rely on env vars */ }
}
loadEnv()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TAGS_MASTER_FILE = join(__dirname, 'tags-master.json')

// ── Curated merge map ─────────────────────────────────────────────────────────
// Format: { canonical: string, aliases: string[] }
// Aliases will be renamed to canonical in faculty_tags.
const MERGES = [
  // ── Within the 4+ list (reduces visible filter tags) ──────────────────────
  { canonical: 'Entrepreneurship',    aliases: ['Startup Strategy'] },
  { canonical: 'Corporate Finance',   aliases: ['Capital Structure', 'Financial Intermediation'] },
  { canonical: 'Marketing Strategy',  aliases: ['Brand Strategy'] },
  { canonical: 'Competitive Strategy',aliases: ['Industrial Organization'] },
  { canonical: 'Financial Reporting', aliases: ['Business Valuation'] },

  // ── Below 4+ (cleanup, prevents future bleed-through) ────────────────────
  { canonical: 'Innovation',          aliases: ['Business Model Innovation', 'Innovation Economics'] },
  { canonical: 'Technology Strategy', aliases: ['R&D Strategy', 'Technology Commercialization'] },
  { canonical: 'Healthcare Management',aliases: ['Healthcare Innovation', 'Value-Based Care'] },
]

// ── Apply merges ──────────────────────────────────────────────────────────────
async function applyMerges() {
  let totalRenamed = 0

  for (const { canonical, aliases } of MERGES) {
    for (const alias of aliases) {
      if (DRY_RUN) {
        // Count rows affected
        const { data } = await supabase.from('faculty_tags').select('id').eq('tag', alias)
        console.log(`  "${alias}" → "${canonical}"  (${(data ?? []).length} rows)`)
        continue
      }

      const { data: rows } = await supabase
        .from('faculty_tags')
        .select('id, faculty_id, source')
        .eq('tag', alias)

      for (const row of (rows ?? [])) {
        await supabase
          .from('faculty_tags')
          .upsert({ faculty_id: row.faculty_id, tag: canonical, source: row.source }, { onConflict: 'faculty_id,tag' })
        await supabase.from('faculty_tags').delete().eq('id', row.id)
        totalRenamed++
      }
    }
  }

  return totalRenamed
}

// ── Regenerate tags-master.json ───────────────────────────────────────────────
async function writeMasterLog() {
  const { data } = await supabase.from('faculty_tags').select('tag, source, faculty_id')
  const map = {}
  for (const row of (data ?? [])) {
    if (!map[row.tag]) map[row.tag] = { count: 0, sources: new Set() }
    map[row.tag].count++
    map[row.tag].sources.add(row.source ?? 'unknown')
  }
  const tags = Object.entries(map)
    .map(([tag, { count, sources }]) => ({ tag, faculty_count: count, sources: [...sources].sort() }))
    .sort((a, b) => b.faculty_count - a.faculty_count || a.tag.localeCompare(b.tag))
  writeFileSync(TAGS_MASTER_FILE, JSON.stringify({
    generated: new Date().toISOString(),
    total_unique_tags: tags.length,
    total_tag_assignments: (data ?? []).length,
    tags,
  }, null, 2), 'utf-8')
  return tags
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== Applying manual merges ===')
  console.log()
  console.log(`${MERGES.reduce((n, m) => n + m.aliases.length, 0)} aliases → ${MERGES.length} canonical tags\n`)

  const renamed = await applyMerges()

  if (DRY_RUN) {
    console.log('\nRe-run without --dry-run to apply.')
    return
  }

  console.log(`\nDone — ${renamed} rows renamed.`)
  console.log('Regenerating tags-master.json…')
  const tags = await writeMasterLog()
  const at4  = tags.filter(t => t.faculty_count >= 4)
  console.log(`tags-master.json updated — ${tags.length} unique tags (${at4.length} at 4+)`)
  console.log('4+ tags:', at4.map(t => `${t.tag} (${t.faculty_count})`).join(', '))
}

main().catch(err => { console.error(err); process.exit(1) })
