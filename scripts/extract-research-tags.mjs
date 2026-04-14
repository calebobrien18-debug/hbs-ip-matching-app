/**
 * extract-research-tags.mjs
 * ==========================
 * Uses Claude Haiku to read each faculty member's bio and extract
 * 4–7 short research interest tags, then upserts them into faculty_tags.
 *
 * After processing, writes scripts/tags-master.json — a full inventory of
 * every tag in the DB, sorted by how many faculty carry it. Commit this
 * file so you have a canonical reference for curation over time.
 *
 * Safe to re-run: skips faculty who already have ANY tags (preserves curated
 * data). To regenerate AI tags for a specific faculty member, delete their
 * rows from faculty_tags where source = 'ai' first.
 *
 * Usage:
 *   node scripts/extract-research-tags.mjs
 *
 * Requires ANTHROPIC_API_KEY, VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
  } catch {
    // .env not found — rely on environment variables
  }
}
loadEnv()

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env')
  console.error('Get one at https://console.anthropic.com and add it to your .env file.')
  process.exit(1)
}

const supabase  = createClient(SUPABASE_URL, SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const TAGS_MASTER_FILE = join(__dirname, 'tags-master.json')

// ── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a research taxonomy assistant for Harvard Business School.
Given a faculty member's biography, extract 4–7 short research interest tags.

Rules:
- Each tag must be a concise noun phrase, 1–4 words (e.g. "Corporate Governance", "Behavioral Finance", "Innovation Strategy")
- Prefer terms used by the business research community, not overly academic jargon
- Do not include the faculty member's name, institution, or teaching method as a tag
- Do not include vague tags like "Research" or "Business"
- Return ONLY a JSON array of strings, no explanation, no markdown fences

Example output: ["Corporate Governance","ESG Investing","Board Dynamics","Shareholder Activism"]`

async function extractTags(name, bio) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Faculty: ${name}\n\nBio:\n${bio.slice(0, 2000)}`,
      },
    ],
  })

  const raw = message.content[0]?.text?.trim() ?? '[]'
  try {
    const tags = JSON.parse(raw)
    if (!Array.isArray(tags)) return []
    return tags
      .filter(t => typeof t === 'string' && t.trim().length > 1 && t.trim().length < 60)
      .map(t => t.trim())
      .slice(0, 7)
  } catch {
    console.warn('    ⚠ Could not parse tags JSON:', raw.slice(0, 100))
    return []
  }
}

// ── tags-master.json ─────────────────────────────────────────────────────────

async function writeMasterLog() {
  // Pull every tag row from the DB, grouped by tag name
  const { data, error } = await supabase
    .from('faculty_tags')
    .select('tag, source, faculty_id')

  if (error) {
    console.warn('Could not fetch tags for master log:', error.message)
    return
  }

  // Build counts map: tag → { count, sources: Set }
  const map = {}
  for (const row of data) {
    if (!map[row.tag]) map[row.tag] = { count: 0, sources: new Set() }
    map[row.tag].count++
    map[row.tag].sources.add(row.source ?? 'unknown')
  }

  const tags = Object.entries(map)
    .map(([tag, { count, sources }]) => ({
      tag,
      faculty_count: count,
      sources: [...sources].sort(),
    }))
    .sort((a, b) => b.faculty_count - a.faculty_count || a.tag.localeCompare(b.tag))

  const output = {
    generated: new Date().toISOString(),
    total_unique_tags: tags.length,
    total_tag_assignments: data.length,
    tags,
  }

  writeFileSync(TAGS_MASTER_FILE, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n📋 tags-master.json written — ${tags.length} unique tags across ${data.length} assignments`)
  console.log(`   Top tags: ${tags.slice(0, 5).map(t => `${t.tag} (${t.faculty_count})`).join(', ')}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all faculty that have a bio
  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('id, name, bio')
    .not('bio', 'is', null)
    .order('name')

  if (error) { console.error('Supabase error:', error.message); process.exit(1) }

  // Skip faculty who already have ANY tags (preserves curated data)
  const { data: existingTags } = await supabase
    .from('faculty_tags')
    .select('faculty_id')

  const alreadyTagged = new Set((existingTags ?? []).map(r => r.faculty_id))
  const toProcess = faculty.filter(f => !alreadyTagged.has(f.id))

  console.log(`Faculty with bios:  ${faculty.length}`)
  console.log(`Already have tags:  ${alreadyTagged.size}`)
  console.log(`To process:         ${toProcess.length}`)
  console.log()

  if (toProcess.length === 0) {
    console.log('Nothing to do — all faculty with bios already have tags.')
    console.log('To regenerate AI tags for a faculty member, run in Supabase SQL editor:')
    console.log("  DELETE FROM faculty_tags WHERE source = 'ai' AND faculty_id = '<uuid>'")
    await writeMasterLog()
    return
  }

  let totalTags = 0
  let skipped = 0

  for (let i = 0; i < toProcess.length; i++) {
    const f = toProcess[i]
    const prefix = `[${i + 1}/${toProcess.length}]`

    if (!f.bio || f.bio.trim().length < 80) {
      console.log(`${prefix} SKIP  ${f.name} — bio too short`)
      skipped++
      continue
    }

    process.stdout.write(`${prefix} ${f.name} … `)

    let tags
    try {
      tags = await extractTags(f.name, f.bio)
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
      skipped++
      continue
    }

    if (tags.length === 0) {
      console.log('no tags extracted')
      skipped++
      continue
    }

    // source='ai' lets us distinguish these from manually curated tags
    const rows = tags.map(tag => ({ faculty_id: f.id, tag, source: 'ai' }))
    const { error: upsertErr } = await supabase
      .from('faculty_tags')
      .upsert(rows, { onConflict: 'faculty_id,tag' })

    if (upsertErr) {
      console.log(`DB ERROR: ${upsertErr.message}`)
      skipped++
    } else {
      console.log(`✓ [${tags.join(', ')}]`)
      totalTags += tags.length
    }

    // Small pause to stay well within rate limits
    if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 300))
  }

  console.log()
  console.log(`Done. ${totalTags} tags inserted across ${toProcess.length - skipped} faculty. ${skipped} skipped.`)

  // Always regenerate the master log at the end
  await writeMasterLog()
}

main()
