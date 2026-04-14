/**
 * clean-faculty-bios.mjs
 * =======================
 * One-time cleanup: strips "Read more" scraping artifacts from faculty bios
 * and trims excessively long bios at a sentence boundary.
 *
 * Usage:
 *   node scripts/clean-faculty-bios.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
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
}

loadEnv()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function cleanBio(bio, name, title) {
  if (!bio) return bio

  // 1. Strip "Read more" and anything after it (HBS website expand-button artifact)
  let text = bio.replace(/\s*\bRead more\b.*/i, '').trim()

  // 2. Strip name/title header injected by HBS page structure
  //    Pattern: "[Name] [Title] [Title] [Name] actual bio..."
  if (name) {
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0].replace(/\.$/, '')
    const lastName  = nameParts[nameParts.length - 1]

    if (text.toLowerCase().startsWith(firstName.toLowerCase())) {
      const titleAnchor = (title ?? '').split(/\s+/).slice(0, 4).join(' ')
      if (titleAnchor && text.slice(0, 300).toLowerCase().includes(titleAnchor.toLowerCase())) {
        const first  = text.indexOf(lastName)
        const second = text.indexOf(lastName, first + lastName.length)
        if (second !== -1 && second <= 700) {
          const stripped = text.slice(second).trim()
          if (stripped.length >= 50) text = stripped
        }
      }
    }
  }

  return text
}

// Fetch all faculty with bios, names, and titles
const { data: rows, error } = await supabase
  .from('faculty')
  .select('id, name, title, bio')
  .not('bio', 'is', null)

if (error) {
  console.error('Fetch error:', error.message)
  process.exit(1)
}

console.log(`Checking ${rows.length} faculty bios…\n`)

let updated = 0
let skipped = 0

for (const row of rows) {
  const cleaned = cleanBio(row.bio, row.name, row.title)
  if (cleaned === row.bio) { skipped++; continue }

  const { error: updateError } = await supabase
    .from('faculty')
    .update({ bio: cleaned })
    .eq('id', row.id)

  if (updateError) {
    console.error(`  Error updating ${row.id}:`, updateError.message)
  } else {
    updated++
    console.log(`  ✓ Cleaned bio for faculty ${row.id}`)
    console.log(`    Before: …${row.bio.slice(-60)}`)
    console.log(`    After:  …${cleaned.slice(-60)}\n`)
  }
}

console.log('='.repeat(50))
console.log(`✅ Done — ${updated} bios cleaned, ${skipped} already clean`)
