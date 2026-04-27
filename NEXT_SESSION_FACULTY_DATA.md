# Faculty Data Quality — Next Session Context

## What was done

A scraper bug was found and fixed, and 20 faculty unit misassignments were corrected in the DB.

### Root causes fixed in `scripts/hbs_scraper.py`

**`_scrape_unit()` (old behavior — now fixed):**
- Scanned ALL `<a>` tags in DOM order → HBS nav bar links like "Finance" and "Marketing" appeared first and won
- Scanned full page text `soup.get_text()` iterating canonical units alphabetically → "Finance" (F) matched before "Technology & Operations Management" (T) on nearly every page

**New behavior:**
- Only looks at `<a>` tags whose `href` contains `/faculty/units/` — these are sidebar/breadcrumb links unique to the faculty's actual unit assignment
- Collects all distinct matches; returns `None` if ambiguous rather than guessing
- Falls back to "X Unit" phrasing in bio text if structural links fail

**`_scrape_bio()` (old behavior — now fixed):**
- Primary class selectors (`biography|bio|about`) didn't match HBS's actual class name (`fullBio`)
- Fallback div scan grabbed publication listing content (citation blocks with "View Details", book titles, years)

**New behavior:**
- Priority selectors are now `fullBio`, `fullbio`, `briefbio` (confirmed HBS class names)
- New `_is_publication_content()` helper rejects text with 2+ artifact signals (`View Details`, `Eds.`, `et al.`, year-density > sentence-density)

### DB corrections applied (20 total)

18 unit corrections from bio-text evidence + 2 manual:
- Lakhani (240491): Finance → Technology & Operations Management
- Abdelal (6628): Finance → Business, Government & International Economy
- Wing (109656): Marketing → Technology & Operations Management
- Iansiti (6482): Strategy → Technology & Operations Management
- Buell (320524): Marketing → Technology & Operations Management
- + 15 more in `scripts/unit_corrections.json`

Backups of pre-fix rows are in `backups/`.

### New scripts added

| Script | Purpose |
|--------|---------|
| `scripts/audit-faculty-data.mjs` | Read-only audit; flags bad bios and wrong units. Supports `--json`. |
| `scripts/re-scrape-flagged-faculty.mjs` | Re-runs corrected scraper on flagged IDs. See CAPTCHA notes below. |
| `scripts/fix-faculty-unit-bio.mjs` | Applies corrections. Modes: `--input`, `--from-rescrape`, `--dry-run`. Always backs up before writing. |

---

## What still needs to be done

Run `node scripts/audit-faculty-data.mjs` to see current state. As of Apr 26 2026, remaining issues were:

**Broken bios (~10 faculty)** — citation/publication blocks instead of narrative text:
- Karim R. Lakhani (240491) — bio is book citations
- Amy C. Edmondson (6451) — year overload
- David B. Yoffie (6577) — year overload
- Linda A. Hill (6479) — 13× "View Details"
- Michael L. Tushman (6584) — year overload
- David S. Scharfstein (13567) — year overload
- Andrei Shleifer (13527) — 8× "View Details"
- David Yang (1061854) — "View Details"
- Dwight Angelini (180090) — 8× "View Details"
- Zoe B. Cullen (879471) — year overload

**Missing unit (16 faculty)** — scraper returned nothing, likely newer/visiting faculty:
Angela Q. Crispi, Anita O. Lynch, Benjamin Bushong, Benjamin Enke, Christian Kaps,
Edward McFowland III, Elisabeth C. Paulson, Fernanda B. Viégas, Georgia Perakis,
Indira Puri, Irene Georgescu, Jacqueline Ng Lane, Martin Wattenberg, Michael Lingzhi Li,
Robert S. Huckman, Yue Maggie Zhou

**Missing bio (6 faculty)** — Benjamin Enke, Indira Puri, Irene Georgescu, Kinshuk Jerath,
Madhav Kumar, Yue Maggie Zhou

**Needs manual review (2 faculty):**
- Randolph B. Cohen (6597): bio says "Lecturer of Entrepreneurial Management in the Finance Unit" — Finance is probably correct, our regex false-positived on it
- Nitin Nohria (6523): bio says "previously...Head of the Organizational Behavior unit" (past role) — General Management may be correct for a former dean

---

## How to re-scrape when ready

### What was tried and what we know

Two scrape attempts on Apr 26–27 2026 were 100% CAPTCHA-blocked. A test with
`headless=False` (real visible browser) was also blocked, confirming this is an
**IP-level Cloudflare block**, not a fingerprinting issue. No scraper change will
help until the block clears or a different network is used.

The scraper has already been hardened with all feasible stealth improvements:
- `playwright-stealth` v2 (`Stealth().apply_stealth_sync(page)`) applied per page
- `headless=False` (real visible browser, `HEADLESS` constant in hbs_scraper.py)
- Random 5–12s delays between requests
- Browser context restarted every 4 faculty (random 8–15s pause)
- `timezone_id`, extra navigator fingerprint masking
- CAPTCHA detection: `_is_captcha_page()` returns `None` instead of storing garbage

### To run the re-scrape

**Before starting**, verify you can load an HBS faculty page in your regular browser:
  https://www.hbs.edu/faculty/Pages/profile.aspx?facId=240491

If that loads normally, your IP is clear and the scraper should work. If you see
a "Human Verification" page, wait longer (Cloudflare blocks typically clear in 24–72h)
or use a different network (phone hotspot, VPN).

**When ready:**
```bash
cd scripts
PYTHONIOENCODING=utf-8 python _scraper_flagged.py
```

Output goes to `scripts/flagged_enriched.json`. The `HEADLESS = False` setting
in `hbs_scraper.py` means a Chromium window will open and be visible while scraping —
this is intentional and makes it much harder for Cloudflare to detect automation.

If you want headless (no visible window), set `HEADLESS = True` in `hbs_scraper.py`
first, but only if the IP block has fully cleared.

### After the scrape succeeds

```bash
# Check what was actually scraped successfully
python -c "
import json
data = json.load(open('flagged_enriched.json'))
ok = [r for r in data if r.get('unit') or r.get('bio')]
blocked = [r for r in data if not r.get('unit') and not r.get('bio')]
print(f'Successfully scraped: {len(ok)}')
print(f'Still empty (blocked or no data): {len(blocked)}')
"

# Build comparison report and apply HIGH-confidence fixes
cd ..
node scripts/re-scrape-flagged-faculty.mjs --from-audit audit-results.json --json > rescrape-report.json
node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json --dry-run
node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json

# Re-audit to see what's left
node scripts/audit-faculty-data.mjs
```

### Resuming a partial scrape

If the scraper gets blocked mid-run, use `START_FROM` in `hbs_scraper.py` to resume:
```python
START_FROM = 20  # skip first 20, resume from #21
```

### If the block never clears

For the ~10 broken bios (Lakhani, Edmondson, Yoffie, Hill, etc.), the manual fallback is to visit each HBS profile in your browser, copy the bio text, and create a corrections file:

```json
[
  {
    "hbs_fac_id": "240491",
    "bio": "Karim Lakhani is the Dorothy and Michael Hintze Professor...",
    "reason": "Manually copied from hbs.edu profile"
  }
]
```

```bash
node scripts/fix-faculty-unit-bio.mjs --input corrections.json --dry-run
node scripts/fix-faculty-unit-bio.mjs --input corrections.json
```

### Workflow for the re-scrape

```bash
# 1. Scrape just the flagged faculty (scripts/flagged_faculty.json was created last session)
cd scripts
PYTHONIOENCODING=utf-8 python _scraper_flagged.py
# Output goes to scripts/flagged_enriched.json

# 2. Build comparison report (the re-scrape script handles this)
cd ..
node scripts/re-scrape-flagged-faculty.mjs --ids 240491,6451,6577,6479,6584,13567,13527,1061854,180090,879471 --json > rescrape-report.json

# 3. Dry-run fixes
node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json --dry-run

# 4. Apply
node scripts/fix-faculty-unit-bio.mjs --from-rescrape rescrape-report.json

# 5. Audit to verify
node scripts/audit-faculty-data.mjs
```

### If the re-scrape is still blocked

For the broken bios, the fallback is to manually copy bio text from each faculty's HBS profile page and create a `corrections.json`:

```json
[
  {
    "hbs_fac_id": "240491",
    "bio": "Karim Lakhani is the Dorothy and Michael Hintze Professor...",
    "reason": "Manually copied from https://www.hbs.edu/faculty/Pages/profile.aspx?facId=240491"
  }
]
```

Then apply with:
```bash
node scripts/fix-faculty-unit-bio.mjs --input corrections.json --dry-run
node scripts/fix-faculty-unit-bio.mjs --input corrections.json
```

---

## Quick audit command

```bash
node scripts/audit-faculty-data.mjs
```

This is always safe to run (read-only) and will tell you exactly what's still outstanding.
