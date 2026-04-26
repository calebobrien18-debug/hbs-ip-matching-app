/**
 * re-scrape-flagged-faculty.mjs
 * ==============================
 * Runs the corrected Python scraper against a targeted list of faculty and
 * produces a structured comparison of current DB values vs. corrected scraped
 * values. Useful for grounding repair decisions in fresh scraper output rather
 * than heuristics over already-bad DB data.
 *
 * Prerequisites:
 *   - Python environment with playwright and beautifulsoup4 installed
 *   - scripts/hbs_scraper.py patched (fixed _scrape_unit / _scrape_bio)
 *   - Run locally — hbs.edu returns 403 to cloud/server requests
 *
 * Usage:
 *   # From audit JSON (all flagged faculty):
 *   node scripts/re-scrape-flagged-faculty.mjs --from-audit audit-results.json
 *
 *   # Specific hbs_fac_ids:
 *   node scripts/re-scrape-flagged-faculty.mjs --ids 240491,109656,6628
 *
 *   # Output JSON for piping into fix script:
 *   node scripts/re-scrape-flagged-faculty.mjs --from-audit audit-results.json --json
 *
 * Output JSON schema (one entry per faculty):
 *   {
 *     hbs_fac_id, name, profile_url,
 *     current: { unit, bio },
 *     scraped: { unit, bio },
 *     unit_changed: bool, bio_changed: bool,
 *     unit_confidence: 'HIGH' | 'REVIEW' | 'NONE',
 *     bio_confidence:  'HIGH' | 'REVIEW' | 'NONE',
 *   }
 */

import { createClient }         from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath }        from 'url'
import { dirname, join }        from 'path'
import { execFileSync }         from 'child_process'
import { tmpdir }               from 'os'
import { randomBytes }          from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const JSON_MODE = process.argv.includes('--json')

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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── Parse args ────────────────────────────────────────────────────────────────
let targetIds = []

const auditFlag = process.argv.indexOf('--from-audit')
if (auditFlag !== -1 && process.argv[auditFlag + 1]) {
  const auditPath = process.argv[auditFlag + 1]
  try {
    const auditData = JSON.parse(readFileSync(auditPath, 'utf-8'))
    targetIds = auditData.map(r => String(r.hbs_fac_id))
    if (!JSON_MODE) console.error(`Loaded ${targetIds.length} flagged IDs from ${auditPath}`)
  } catch (err) {
    console.error(`Could not read audit file ${auditPath}:`, err.message)
    process.exit(1)
  }
} else {
  const idsFlag = process.argv.indexOf('--ids')
  if (idsFlag !== -1 && process.argv[idsFlag + 1]) {
    targetIds = process.argv[idsFlag + 1].split(',').map(s => s.trim()).filter(Boolean)
  }
}

if (targetIds.length === 0) {
  console.error('Usage:')
  console.error('  node scripts/re-scrape-flagged-faculty.mjs --from-audit audit-results.json [--json]')
  console.error('  node scripts/re-scrape-flagged-faculty.mjs --ids 240491,109656 [--json]')
  process.exit(1)
}

// ── Fetch current DB values ───────────────────────────────────────────────────
const { data: dbRows, error: fetchError } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id, name, unit, bio, profile_url')

if (fetchError) {
  console.error('DB fetch error:', fetchError.message)
  process.exit(1)
}

const dbMap = Object.fromEntries(dbRows.map(r => [r.hbs_fac_id, r]))

// Filter to the targets that exist in DB
const targets = targetIds.map(id => dbMap[id]).filter(Boolean)
const missing = targetIds.filter(id => !dbMap[id])
if (missing.length > 0 && !JSON_MODE) {
  console.error(`  ⚠  ${missing.length} IDs not found in DB: ${missing.join(', ')}`)
}

if (!JSON_MODE) {
  console.error(`\nRe-scraping ${targets.length} faculty profiles using corrected scraper…`)
  console.error('This requires Python + Playwright and a local network connection.\n')
}

// ── Python scraper bridge ─────────────────────────────────────────────────────
// We call hbs_scraper.py in targeted mode by passing a JSON list of facIds.
// The scraper is modified to accept a --target-ids argument when running in
// targeted mode; if not yet modified, this script generates a temporary
// all_faculty.json containing only the target faculty, runs the scraper, then
// reads the enriched output.

const scraperPath  = join(__dirname, 'hbs_scraper.py')
const tmpId        = randomBytes(4).toString('hex')
const tmpInput     = join(tmpdir(), `hbs_targets_${tmpId}.json`)
const tmpOutput    = join(tmpdir(), `hbs_enriched_${tmpId}.json`)

// Build a minimal all_faculty.json with only the target faculty
const targetFacultyList = targets.map(r => ({
  hbs_fac_id: r.hbs_fac_id,
  name: r.name,
  profile_url: r.profile_url ?? `https://www.hbs.edu/faculty/Pages/profile.aspx?facId=${r.hbs_fac_id}`,
}))
writeFileSync(tmpInput, JSON.stringify(targetFacultyList, null, 2))

if (!JSON_MODE) console.error(`Saved ${targets.length} targets to ${tmpInput}`)

// Build a small Python wrapper that calls hbs_scraper with custom input/output paths.
// This avoids modifying hbs_scraper.py itself.
const wrapperCode = `
import sys, json, importlib.util, pathlib

# Patch constants before importing the scraper module
import importlib
spec = importlib.util.spec_from_file_location("hbs_scraper", r"${scraperPath.replace(/\\/g, '\\\\')}")
mod = importlib.util.module_from_spec(spec)

# Override file paths via environment before exec
import os
os.environ["_HBS_SCRAPER_ALL_FACULTY"] = r"${tmpInput.replace(/\\/g, '\\\\')}"
os.environ["_HBS_SCRAPER_OUTPUT"]      = r"${tmpOutput.replace(/\\/g, '\\\\')}"

spec.loader.exec_module(mod)
`

const wrapperPath = join(tmpdir(), `hbs_scraper_wrapper_${tmpId}.py`)
writeFileSync(wrapperPath, wrapperCode)

// ── Check if scraper supports env-based path override; otherwise patch inline ──
// The standard hbs_scraper.py reads ALL_FACULTY_FILE and OUTPUT_FILE as
// module-level constants. We run it via subprocess, relying on the env vars
// _HBS_SCRAPER_ALL_FACULTY and _HBS_SCRAPER_OUTPUT being honoured by a
// patched version. If those env vars are not supported, the script falls
// back to reading a patched copy of the scraper.

let scraperSrc = readFileSync(scraperPath, 'utf-8')

// Inject env-override support if not already present
if (!scraperSrc.includes('_HBS_SCRAPER_ALL_FACULTY')) {
  scraperSrc = scraperSrc
    .replace(
      /^(OUTPUT_FILE\s*=\s*Path.*)/m,
      'OUTPUT_FILE       = Path(os.environ.get("_HBS_SCRAPER_OUTPUT",      str(Path(__file__).parent / "enriched_faculty.json")))',
    )
    .replace(
      /^(ALL_FACULTY_FILE\s*=\s*Path.*)/m,
      'ALL_FACULTY_FILE  = Path(os.environ.get("_HBS_SCRAPER_ALL_FACULTY", str(Path(__file__).parent / "all_faculty.json")))',
    )
  // Add import os if not present
  if (!scraperSrc.includes('import os')) {
    scraperSrc = 'import os\n' + scraperSrc
  }
}

const patchedScraperPath = join(tmpdir(), `hbs_scraper_patched_${tmpId}.py`)
writeFileSync(patchedScraperPath, scraperSrc)

if (!JSON_MODE) console.error('Running patched scraper (this may take a few minutes)…\n')

try {
  execFileSync(
    'python',
    [patchedScraperPath],
    {
      env: {
        ...process.env,
        _HBS_SCRAPER_ALL_FACULTY: tmpInput,
        _HBS_SCRAPER_OUTPUT:      tmpOutput,
        PYTHONIOENCODING:         'utf-8',
      },
      // Always route Python's stdout to stderr so it doesn't pollute our JSON output
      stdio: [0, 2, 2],
      timeout: 10 * 60 * 1000, // 10 minutes
    },
  )
} catch (err) {
  console.error('Scraper process failed:', err.message)
  console.error('Make sure Python + Playwright + beautifulsoup4 are installed.')
  process.exit(1)
}

// ── Read scraper output ───────────────────────────────────────────────────────
let scraped
try {
  scraped = JSON.parse(readFileSync(tmpOutput, 'utf-8'))
} catch {
  console.error(`Could not read scraper output at ${tmpOutput}`)
  process.exit(1)
}

const scrapedMap = Object.fromEntries(scraped.map(r => [r.hbs_fac_id, r]))

// ── Build comparison report ───────────────────────────────────────────────────

const CANONICAL_UNITS = new Set([
  'Accounting & Management', 'Business, Government & International Economy',
  'Entrepreneurial Management', 'Finance', 'General Management', 'Marketing',
  'Negotiation, Organizations & Markets', 'Organizational Behavior',
  'Strategy', 'Technology & Operations Management',
])

const PUB_ARTIFACT_RE = /View Details|Eds?\.|et al/gi

function bioIsClean(bio) {
  if (!bio) return false
  const hits = (bio.match(PUB_ARTIFACT_RE) || []).length
  const years = (bio.match(/\b(19|20)\d{2}\b/g) || []).length
  const sentences = (bio.match(/[.!?]\s+[A-Z]/g) || []).length
  if (hits >= 2) return false
  if (years > 5 && years > sentences) return false
  return bio.length >= 80
}

const report = []

for (const target of targets) {
  const s = scrapedMap[target.hbs_fac_id]

  const current = { unit: target.unit ?? null, bio: target.bio ?? null }
  const scraped_data = s ? { unit: s.unit ?? null, bio: s.bio ?? null } : { unit: null, bio: null }

  const unit_changed = scraped_data.unit !== null && scraped_data.unit !== current.unit
  const bio_changed  = scraped_data.bio  !== null && scraped_data.bio  !== current.bio

  // Unit confidence: HIGH only if scraper found exactly one canonical unit via /faculty/units/ links.
  // We can't know that from output alone, but if the new unit differs from current and is canonical,
  // treat as HIGH; if scraper returned null, treat as NONE.
  let unit_confidence = 'NONE'
  if (s && scraped_data.unit) {
    unit_confidence = CANONICAL_UNITS.has(scraped_data.unit) && unit_changed ? 'HIGH' : 'REVIEW'
  }

  // Bio confidence: HIGH if current bio was clearly bad and new bio looks clean.
  let bio_confidence = 'NONE'
  if (bio_changed) {
    const currentBad  = !bioIsClean(current.bio)
    const scrapedGood = bioIsClean(scraped_data.bio)
    if (currentBad && scrapedGood) bio_confidence = 'HIGH'
    else if (scrapedGood)          bio_confidence = 'REVIEW'
  }

  report.push({
    hbs_fac_id: target.hbs_fac_id,
    name: target.name,
    profile_url: target.profile_url,
    current,
    scraped: scraped_data,
    unit_changed,
    bio_changed,
    unit_confidence,
    bio_confidence,
  })
}

// ── Output ────────────────────────────────────────────────────────────────────

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('\n' + '='.repeat(64))
  console.log('RE-SCRAPE COMPARISON REPORT')
  console.log('='.repeat(64) + '\n')

  for (const r of report) {
    const unitMarker = r.unit_changed ? (r.unit_confidence === 'HIGH' ? '✓' : '?') : '–'
    const bioMarker  = r.bio_changed  ? (r.bio_confidence  === 'HIGH' ? '✓' : '?') : '–'
    console.log(`[${r.hbs_fac_id}] ${r.name}`)
    console.log(`  unit [${unitMarker}]:  "${r.current.unit}" → "${r.scraped.unit ?? '(none)'}"  (${r.unit_confidence})`)
    if (r.bio_changed) {
      const oldSnip = (r.current.bio ?? '').slice(0, 80).replace(/\n/g, ' ')
      const newSnip = (r.scraped.bio ?? '').slice(0, 80).replace(/\n/g, ' ')
      console.log(`  bio  [${bioMarker}]:  OLD: "${oldSnip}…"`)
      console.log(`         NEW: "${newSnip}…"  (${r.bio_confidence})`)
    } else {
      console.log(`  bio  [–]:  unchanged`)
    }
    console.log()
  }

  const highUnit = report.filter(r => r.unit_confidence === 'HIGH').length
  const highBio  = report.filter(r => r.bio_confidence  === 'HIGH').length
  console.log('─'.repeat(64))
  console.log(`HIGH-confidence unit fixes: ${highUnit}`)
  console.log(`HIGH-confidence bio fixes:  ${highBio}`)
  console.log()
  console.log('To apply fixes:')
  console.log('  node scripts/re-scrape-flagged-faculty.mjs --from-audit audit-results.json --json \\')
  console.log('    | node scripts/fix-faculty-unit-bio.mjs --from-rescrape --dry-run')
}
