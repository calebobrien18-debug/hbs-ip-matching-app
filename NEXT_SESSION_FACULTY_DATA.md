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

The re-scrape failed on Apr 26 2026 because HBS was serving CAPTCHA pages to all requests. The scraper uses Playwright (headless Chromium) but HBS's bot detection was active.

### CAPTCHA avoidance tips

**1. Add delays between requests**

In `hbs_scraper.py`, find the `main()` loop where it calls `fetch_profile()` and add a longer sleep:

```python
# Current (too fast for HBS bot detection):
time.sleep(1)

# Better:
import random
time.sleep(random.uniform(4, 9))  # random 4–9 second delay between each profile
```

**2. Restart the browser context more frequently**

Currently the scraper restarts every 10 faculty. Try every 3–5:

```python
# Find this in main():
if i > 0 and i % 10 == 0:   # current
if i > 0 and i % 3 == 0:    # try this
```

**3. Use playwright stealth / user-agent spoofing**

Add stealth headers when launching the browser context:

```python
# In the playwright context launch, add:
context = browser.new_context(
    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale='en-US',
    timezone_id='America/New_York',
    viewport={'width': 1280, 'height': 800},
)
```

Or install `playwright-stealth`:
```bash
pip install playwright-stealth
```
```python
from playwright_stealth import stealth_sync
stealth_sync(page)
```

**4. Run at off-peak hours**

HBS bot detection is more aggressive under load. Try early morning US Eastern time (6–8am).

**5. Scrape in small batches with long gaps**

Instead of all 62 at once, scrape 10 at a time with a 10-minute break between batches. The `START_FROM` constant in `hbs_scraper.py` lets you resume:

```python
START_FROM = 0   # set to N to skip first N faculty and resume
```

Use `scripts/flagged_faculty.json` (already created) as the input for a targeted run of just the 32 remaining problem cases.

**6. Check if the CAPTCHA is Cloudflare**

If the bio text contains "solve a puzzle", it's a Cloudflare challenge page. Some options:
- Use `cloudscraper` pip package instead of plain requests (though we're using Playwright, so this may not help)
- Try running from a residential IP rather than a datacenter IP
- Run the scraper from a VPN endpoint in a residential ISP range

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
