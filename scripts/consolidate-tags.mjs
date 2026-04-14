/**
 * consolidate-tags.mjs
 * =====================
 * Uses Claude to identify near-duplicate and adjacent research tags, then
 * merges them into canonical names in faculty_tags and rewrites tags-master.json.
 *
 * Only processes tags that appear on 2+ faculty (single-use tags are ignored —
 * they won't show in the filter UI regardless).
 *
 * Safe to re-run: reads current DB state each time.
 *
 * Usage:
 *   node scripts/consolidate-tags.mjs [--dry-run]
 *
 *   --dry-run   Print the proposed merge map without touching the DB.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN   = process.argv.includes('--dry-run')

// ── Load .env ────────────────────────────────────────────────────────────────
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

const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TAGS_MASTER_FILE = join(__dirname, 'tags-master.json')

// ── Step 1: fetch tags that appear on 2+ faculty ─────────────────────────────
async function fetchCandidateTags() {
  const { data, error } = await supabase
    .from('faculty_tags')
    .select('tag, faculty_id')
  if (error) throw new Error('Supabase: ' + error.message)

  const counts = {}
  for (const row of data) counts[row.tag] = (counts[row.tag] ?? 0) + 1

  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
}

// ── Step 2: ask Claude for a merge map ───────────────────────────────────────
async function getMergeMap(tags) {
  const tagList = tags.map(t => `${t.count}x  ${t.tag}`).join('\n')

  const prompt = `You are curating a research interest taxonomy for Harvard Business School's faculty directory.

Below is the current list of research tags, each with how many faculty carry it (more = more important to keep).

Your job: identify groups of tags that are near-duplicates or closely adjacent, and for each group propose ONE canonical name that should survive. Tags that are genuinely distinct should stay separate.

Guidelines:
- Prefer the more specific or widely-used label as the canonical (higher count wins ties)
- "Leadership" and "Leadership Development" → canonical: "Leadership Development"
- "Negotiation" and "Negotiation Strategy" → canonical: "Negotiation"
- "Innovation Management" and "Innovation Strategy" → canonical: "Innovation"
- "Competitive Strategy", "Competitive Dynamics", "Competitive Advantage" → canonical: "Competitive Strategy"
- Do NOT merge things that are meaningfully distinct (e.g. "Venture Capital" ≠ "Private Equity")
- Do NOT merge broad terms with specific ones unless they are truly redundant (e.g. "Strategy" → "Competitive Strategy")
- Only include a tag in a merge group if it should actually be renamed; leave singletons out

Return ONLY valid JSON in this exact shape (no markdown fences, no commentary):
{
  "merges": [
    { "canonical": "Leadership Development", "aliases": ["Leadership", "Executive Leadership"] },
    { "canonical": "Negotiation",            "aliases": ["Negotiation Strategy"] }
  ]
}

Tags to analyse:
${tagList}`

  const message = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 2048,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0]?.text?.trim() ?? '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

// ── Step 3: apply merges to DB ────────────────────────────────────────────────
async function applyMerges(merges) {
  let totalRenamed = 0

  for (const { canonical, aliases } of merges) {
    if (!aliases?.length) continue
    for (const alias of aliases) {
      if (alias === canonical) continue

      if (DRY_RUN) {
        console.log(`  [dry-run] "${alias}" → "${canonical}"`)
        continue
      }

      // For each faculty that has the alias, upsert the canonical tag and delete the alias.
      // We do it row by row to handle the unique(faculty_id, tag) constraint gracefully.
      const { data: rows } = await supabase
        .from('faculty_tags')
        .select('id, faculty_id, source')
        .eq('tag', alias)

      for (const row of (rows ?? [])) {
        // Upsert canonical (may already exist for this faculty — that's fine)
        await supabase
          .from('faculty_tags')
          .upsert({ faculty_id: row.faculty_id, tag: canonical, source: row.source }, { onConflict: 'faculty_id,tag' })

        // Delete the alias row
        await supabase
          .from('faculty_tags')
          .delete()
          .eq('id', row.id)

        totalRenamed++
      }
    }
  }
  return totalRenamed
}

// ── Step 4: regenerate tags-master.json ──────────────────────────────────────
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
  const out = {
    generated: new Date().toISOString(),
    total_unique_tags: tags.length,
    total_tag_assignments: (data ?? []).length,
    tags,
  }
  writeFileSync(TAGS_MASTER_FILE, JSON.stringify(out, null, 2), 'utf-8')
  return tags
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — no DB changes ===' : '=== Consolidating tags ===')
  console.log()

  console.log('Fetching candidate tags (2+ faculty)…')
  const candidates = await fetchCandidateTags()
  console.log(`Found ${candidates.length} tags on 2+ faculty\n`)

  console.log('Asking Claude Opus to propose merges…')
  const { merges } = await getMergeMap(candidates)
  console.log(`Claude proposed ${merges.length} merge groups:\n`)

  for (const { canonical, aliases } of merges) {
    console.log(`  "${canonical}"  ←  ${aliases.map(a => `"${a}"`).join(', ')}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('Dry-run DB actions:')
    await applyMerges(merges)
    console.log('\nRe-run without --dry-run to apply.')
    return
  }

  console.log('Applying merges to DB…')
  const renamed = await applyMerges(merges)
  console.log(`Done — ${renamed} tag rows renamed.\n`)

  console.log('Regenerating tags-master.json…')
  const tags = await writeMasterLog()
  const threshold4 = tags.filter(t => t.faculty_count >= 4).length
  console.log(`tags-master.json updated — ${tags.length} unique tags (${threshold4} at 4+ faculty)`)
  console.log(`Top 10: ${tags.slice(0, 10).map(t => t.tag).join(', ')}`)
}

main().catch(err => { console.error(err); process.exit(1) })
