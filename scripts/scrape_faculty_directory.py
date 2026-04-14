"""
HBS Faculty Directory Scraper
==============================
Scrapes the HBS faculty directory page to discover all faculty members
and their basic profile data (hbs_fac_id, name, unit, profile_url).

Must be run locally — hbs.edu returns 403 to server-side requests.
Uses the same Playwright stealth setup as hbs_scraper.py.

Usage:
    cd scripts
    python scrape_faculty_directory.py

Output: scripts/all_faculty.json
Next step: node scripts/import-faculty-directory.mjs
"""

import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# ── Configuration ─────────────────────────────────────────────────────────────

DIRECTORY_URL = "https://www.hbs.edu/faculty/Pages/browse.aspx?faculty=Current"
OUTPUT_FILE   = Path(__file__).parent / "all_faculty.json"
DEBUG_HTML    = Path(__file__).parent / "debug_directory.html"
DEBUG         = False  # set True to save the rendered HTML for inspection

HBS_BASE = "https://www.hbs.edu"

FAC_ID_RE = re.compile(r"[?&]facId=(\d+)", re.I)


# ── Scraper ────────────────────────────────────────────────────────────────────

def scrape_directory() -> list[dict]:
    """
    Scrape the HBS faculty directory and return a list of faculty dicts:
      { hbs_fac_id, name, unit, profile_url }
    """
    faculty = []

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
            viewport={"width": 1280, "height": 900},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = context.new_page()
        print(f"Loading directory: {DIRECTORY_URL}")
        page.goto(DIRECTORY_URL, wait_until="networkidle", timeout=45000)

        # Scroll to bottom to trigger any lazy-loaded content
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1000)

        html = page.content()

        if DEBUG:
            DEBUG_HTML.write_text(html, encoding="utf-8")
            print(f"  [debug] Saved directory HTML to {DEBUG_HTML}")

        page.close()
        context.close()
        browser.close()

    soup = BeautifulSoup(html, "lxml")
    faculty = _parse_directory(soup)
    return faculty


def _parse_directory(soup: BeautifulSoup) -> list[dict]:
    """
    Parse the HBS faculty browse page.

    Observed structure (browse.aspx?faculty=Current):
      div.row-left  (outer card per faculty)
        div.large-letter-container
          div.span1   (alphabetical letter or photo thumb)
          div.span99
            <a class="epsilon ext" href="/faculty/Pages/profile.aspx?facId=XXXX">Name</a>
        div.shim22
        div.row-left   ← faculty title/rank
        div.shim22
        div.row-left   ← academic unit
        div.shim22
    """
    faculty = []
    seen_ids = set()

    all_links = soup.find_all("a", href=FAC_ID_RE)

    for a in all_links:
        href = a.get("href", "")
        m = FAC_ID_RE.search(href)
        if not m:
            continue

        fac_id = m.group(1)
        if fac_id in seen_ids:
            continue
        seen_ids.add(fac_id)

        name = a.get_text(strip=True)
        if not name or len(name) < 2:
            continue

        profile_url = f"{HBS_BASE}/faculty/Pages/profile.aspx?facId={fac_id}"

        faculty.append({
            "hbs_fac_id":  fac_id,
            "name":        name,
            "profile_url": profile_url,
            # unit is extracted from each individual profile page by hbs_scraper.py
        })

    return faculty



# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("HBS Faculty Directory Scraper")
    print("=" * 50)

    faculty = scrape_directory()

    if not faculty:
        print("\n⚠  No faculty found — the directory page structure may have changed.")
        print("   Set DEBUG = True at the top of this script and re-run to inspect the HTML.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as fp:
        json.dump(faculty, fp, indent=2, ensure_ascii=False)

    print(f"\nFound {len(faculty)} faculty members.")
    print("(Unit will be populated per faculty during the enrichment scrape.)")

    print(f"\nOutput: {OUTPUT_FILE}")
    print("\nNext step: node scripts/import-faculty-directory.mjs")


if __name__ == "__main__":
    main()
