"""
HBS Faculty Enrichment Scraper
===============================
Fetches photos and recent publications from HBS faculty profile pages
for the 20 pilot faculty members. Must be run locally -- hbs.edu returns
403 to server-side / cloud requests.

Uses Playwright (headless Chromium) so that JavaScript-rendered content
(publication lists) is fully loaded before parsing.

Photos are derived directly from the predictable HBS headshot API URL
(no scraping needed): Style Library/api/headshot.aspx?id={facId}

Research keyword tags are managed via the curated migration seed
(008_seed_faculty_tags.sql) and are not scraped here.

Usage:
    cd scripts
    pip install playwright beautifulsoup4 lxml
    python -m playwright install chromium
    python hbs_scraper.py

Output: scripts/enriched_faculty.json
"""

import json
import re
import time
from pathlib import Path

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# ── Configuration ─────────────────────────────────────────────────────────────

OUTPUT_FILE  = Path(__file__).parent / "enriched_faculty.json"
DEBUG_HTML   = Path(__file__).parent / "debug_profile.html"  # saved when DEBUG=True
DEBUG        = False  # set True to save the first profile's HTML for inspection

# The 20 pilot faculty — (hbs_fac_id, name) for logging
PILOT_FACULTY = [
    ("1324810", "Jung Koo Kang"),
    ("740159",  "Jonas Heese"),
    ("1356397", "Jesse M. Shapiro"),
    ("937841",  "Caroline M. Elkins"),
    ("6463",    "Paul A. Gompers"),
    ("337264",  "Tom Nicholas"),
    ("10639",   "Malcolm Baker"),
    ("92011",   "John D. Macomber"),
    ("244024",  "Anita Elberse"),
    ("261323",  "Sunil Gupta"),
    ("1495303", "Alex Chan"),
    ("326229",  "Michael I. Norton"),
    ("6479",    "Linda A. Hill"),
    ("10650",   "Boris Groysberg"),
    ("24279",   "Ramon Casadesus-Masanell"),
    ("871877",  "Andy Wu"),
    ("6482",    "Marco Iansiti"),
    ("6451",    "Amy C. Edmondson"),
    ("240491",  "Karim R. Lakhani"),
    ("14938",   "Feng Zhu"),
]

PROFILE_BASE  = "https://www.hbs.edu/faculty/Pages/profile.aspx?facId={}&view=publications"
# HBS headshot API — returns a JPEG for any valid facId
HEADSHOT_BASE = "https://www.hbs.edu/Style%20Library/api/headshot.aspx?id={}"

# Publication section heading text -> pub_type mapping
# HBS uses ALL-CAPS headings like "JOURNAL ARTICLES", "WORKING PAPERS", etc.
PUB_SECTION_TYPES = {
    "journal article": "Journal Article",
    "article":         "Journal Article",
    "book chapter":    "Chapter",
    "chapter":         "Chapter",
    "book":            "Book",
    "case":            "Case",
    "working paper":   "Working Paper",
    "conference":      "Conference Paper",
    "report":          "Report",
    "other":           "Other",
}

YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")

MAX_PUBLICATIONS = 20          # total cap per faculty
TYPE_QUOTAS = {                # guaranteed minimums (where available)
    "Journal Article": 5,
    "Working Paper":   5,
    "Case":            5,
}


# ── Fetch helpers ─────────────────────────────────────────────────────────────

def fetch_profile(page, fac_id: str, save_debug: bool = False):
    """Navigate to a faculty profile page and return fully-rendered HTML as BeautifulSoup."""
    url = PROFILE_BASE.format(fac_id)
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        html = page.content()
        if save_debug:
            DEBUG_HTML.write_text(html, encoding="utf-8")
            print(f"    [debug] Saved rendered HTML to {DEBUG_HTML}")
        return BeautifulSoup(html, "lxml")
    except Exception as e:
        print(f"    X Error loading facId={fac_id}: {e}")
        return None


# ── Photo ─────────────────────────────────────────────────────────────────────

def get_photo_url(fac_id: str) -> str:
    """
    Return the HBS headshot API URL for this faculty member.
    The URL is predictable — no scraping required.
    """
    return HEADSHOT_BASE.format(fac_id)


# ── Publication scraping ──────────────────────────────────────────────────────

def scrape_publications(soup, fac_id: str) -> list:
    """
    Extract recent publications from a fully-rendered HBS faculty profile page.

    HBS page structure:
      <div class="toggle-container">
        <h3 class="eta-uc">
          <div class="toggle-hide"><a>JOURNAL ARTICLES</a></div>
        </h3>
        <div class="toggle-hide has-slide">
          <ul class="unstyled list-publications ...">
            <li><div>Authors. <a href="...">Title</a> Journal Year. <a>View Details</a></div></li>
            ...
          </ul>
        </div>
      </div>
    """
    pubs = []

    for container in soup.find_all("div", class_="toggle-container"):
        h3 = container.find("h3")
        if not h3:
            continue

        heading_text = h3.get_text(strip=True).lower()
        # Normalise plural: "journal articles" -> match "journal article"
        heading_text = heading_text.rstrip("s")

        pub_type = None
        for pattern, ptype in PUB_SECTION_TYPES.items():
            if pattern in heading_text:
                pub_type = ptype
                break
        if pub_type is None:
            continue

        pub_list = container.find("ul", class_=re.compile(r"list-publication", re.I))
        if not pub_list:
            # Fallback: any ul within the container
            pub_list = container.find("ul")
        if not pub_list:
            continue

        for li in pub_list.find_all("li", recursive=False):
            pub = _parse_pub_entry(li, pub_type)
            if pub:
                pubs.append(pub)

    pubs = _dedup_pubs(pubs)
    return _select_with_quotas(pubs)


def _select_with_quotas(pubs: list) -> list:
    """
    Select up to MAX_PUBLICATIONS publications using a quota-then-fill strategy:
      1. Guarantee up to TYPE_QUOTAS[type] most-recent pubs per priority type.
      2. Fill any remaining slots (up to MAX_PUBLICATIONS) with the most recent
         publications across all types not yet included.
      3. Return sorted by year descending.
    """
    # Sort all pubs by year desc once
    by_year = sorted(pubs, key=lambda p: p.get("year") or 0, reverse=True)

    selected = []
    seen = set()  # keyed by lowercased title prefix

    def _add(pub):
        key = pub["title"].lower()[:80]
        if key not in seen:
            seen.add(key)
            selected.append(pub)

    # Step 1 — fill guaranteed slots per priority type (most recent first)
    by_type = {}
    for pub in by_year:
        by_type.setdefault(pub["pub_type"], []).append(pub)

    for pub_type, quota in TYPE_QUOTAS.items():
        for pub in by_type.get(pub_type, [])[:quota]:
            _add(pub)

    # Step 2 — fill remaining slots with most-recent across all types
    for pub in by_year:
        if len(selected) >= MAX_PUBLICATIONS:
            break
        _add(pub)

    # Step 3 — return sorted by year desc
    selected.sort(key=lambda p: p.get("year") or 0, reverse=True)
    return selected


def _parse_pub_entry(entry, pub_type: str):
    """
    Parse a single <li> publication entry.

    HBS entry structure:
      <li>
        <div>Authors. <a href="URL">Title text <span class="pdf-append">(pdf)</span></a>
             <i>Journal Name</i> Vol (Year): pages. <a>View Details</a></div>
        <div class="shim20"></div>
      </li>
    """
    text = entry.get_text(separator=" ", strip=True)
    if len(text) < 10:
        return None

    # Find the first <a> that is NOT a "View Details" / toggle link
    title_tag = None
    url = None
    view_details_url = None
    for a in entry.find_all("a"):
        a_text = a.get_text(strip=True)
        href = a.get("href", "")
        if a_text.lower() in ("view details", "view detail", "") or href.startswith("#"):
            # Capture View Details URL as fallback for case entries
            if a_text.lower().startswith("view detail") and href and not href.startswith("#"):
                view_details_url = href if href.startswith("http") else "https://www.hbs.edu" + href
            continue
        title_tag = a
        if href and not href.startswith("#"):
            url = href if href.startswith("http") else "https://www.hbs.edu" + href
        break
    # Use View Details URL when there's no primary link (common for cases)
    if not url and view_details_url:
        url = view_details_url

    if title_tag:
        # Get title text, strip surrounding quotes and the "(pdf)" suffix
        raw_title = title_tag.get_text(strip=True)
        raw_title = re.sub(r"\s*\(pdf\)\s*$", "", raw_title, flags=re.I).strip()
        title = raw_title.strip('"').strip("\u201c\u201d").strip("'").strip()
    else:
        # No title link — title is in the plain text, usually in quotes.
        # e.g. 'Smith, J. "Case Title." HBS Case 123-456, 2024. View Details'
        quoted = re.search(r'["\u201c\u201e]([^"\u201c\u201d\u201e]{10,})["\u201d]', text)
        if quoted:
            title = quoted.group(1).strip().rstrip(".")
        else:
            # Last resort: use the italicised text if present
            italic = entry.find("i")
            title = italic.get_text(strip=True) if italic else ""

    if not title or len(title) < 5:
        return None

    # Year: first 4-digit year in the full text
    year_match = YEAR_RE.search(text)
    year = int(year_match.group()) if year_match else None

    # Journal: look for <i> tag (HBS italicises journal names)
    journal = None
    italic = entry.find("i")
    if italic:
        journal_text = italic.get_text(strip=True)
        if journal_text and len(journal_text) < 120:
            journal = journal_text

    return {"title": title, "year": year, "pub_type": pub_type, "journal": journal, "url": url}


def _dedup_pubs(pubs: list) -> list:
    seen = set()
    result = []
    for pub in pubs:
        key = pub["title"].lower()[:80]
        if key not in seen:
            seen.add(key)
            result.append(pub)
    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("HBS Faculty Enrichment Scraper (Playwright)")
    print("=" * 50)
    print(f"Scraping {len(PILOT_FACULTY)} faculty members...\n")

    results = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 800},
        )
        # Remove the webdriver flag that sites use to detect automation
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        for i, (fac_id, name) in enumerate(PILOT_FACULTY, 1):
            print(f"[{i:2}/{len(PILOT_FACULTY)}] {name} (facId={fac_id})")

            page = context.new_page()
            soup = fetch_profile(page, fac_id, save_debug=(DEBUG and i == 1))
            page.close()

            photo_url    = get_photo_url(fac_id)
            publications = scrape_publications(soup, fac_id) if soup else []

            type_counts = {}
            for p in publications:
                type_counts[p["pub_type"]] = type_counts.get(p["pub_type"], 0) + 1
            breakdown = ", ".join(f"{v} {k}" for k, v in sorted(type_counts.items()))
            print(f"         pubs: {len(publications)} ({breakdown})")

            results.append({
                "hbs_fac_id":   fac_id,
                "photo_url":    photo_url,
                "tags":         [],   # managed via curated migration seed
                "publications": publications,
            })

            time.sleep(1)

        context.close()
        browser.close()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    total_pubs   = sum(len(r["publications"]) for r in results)
    total_photos = sum(1 for r in results if r.get("photo_url"))

    print("\n" + "=" * 50)
    print("Done!")
    print(f"   Photos (URL):         {total_photos}")
    print(f"   Publications scraped: {total_pubs}")
    print(f"   Output: {OUTPUT_FILE}")
    print()
    print("Next step: node scripts/import-enriched.mjs")


if __name__ == "__main__":
    main()
