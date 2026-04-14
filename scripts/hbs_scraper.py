"""
HBS Faculty Enrichment Scraper
===============================
Fetches research keywords and recent publications from HBS faculty profile
pages for the 20 pilot faculty members. Must be run locally — hbs.edu
returns 403 to server-side / cloud requests.

Adapted from: github.com/nbtcub11/hbs-database (scraper.py)

Usage:
    cd scripts
    pip install requests beautifulsoup4 lxml
    python hbs_scraper.py

Output: scripts/enriched_faculty.json
"""

import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── Configuration ─────────────────────────────────────────────────────────────

OUTPUT_FILE = Path(__file__).parent / "enriched_faculty.json"

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

PROFILE_BASE = "https://www.hbs.edu/faculty/Pages/profile.aspx?facId={}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Section headings that signal a keyword/interest block
KEYWORD_HEADING_PATTERNS = re.compile(
    r"research\s*(interests?|areas?|focus|keywords?)?|"
    r"interests?|keywords?|topics?|expertise|areas?\s+of\s+interest",
    re.IGNORECASE,
)

# Publication section headings → pub_type mapping
PUB_SECTION_TYPES = {
    "journal articles": "Journal Article",
    "journal article":  "Journal Article",
    "articles":         "Journal Article",
    "books":            "Book",
    "book":             "Book",
    "book chapters":    "Chapter",
    "chapters":         "Chapter",
    "cases":            "Case",
    "case":             "Case",
    "working papers":   "Working Paper",
    "working paper":    "Working Paper",
    "conference":       "Conference Paper",
    "reports":          "Report",
    "other":            "Other",
}

YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")

MAX_PUBLICATIONS = 10


# ── Fetch helpers ─────────────────────────────────────────────────────────────

def fetch_profile(fac_id: str) -> BeautifulSoup | None:
    url = PROFILE_BASE.format(fac_id)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except requests.RequestException as e:
        print(f"    ✗ HTTP error for facId={fac_id}: {e}")
        return None


# ── Keyword scraping ──────────────────────────────────────────────────────────

def scrape_keywords(soup: BeautifulSoup) -> list[str]:
    """
    Extract research keyword/interest tags from a faculty profile page.
    Tries multiple selector strategies; returns a deduped list of strings.
    """
    tags: list[str] = []

    # Strategy 1 — look for a heading whose text matches keyword patterns,
    # then collect text from the next sibling element(s).
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "strong", "b"]):
        heading_text = heading.get_text(strip=True)
        if KEYWORD_HEADING_PATTERNS.search(heading_text):
            # Gather text from the next sibling paragraph or list
            sibling = heading.find_next_sibling(["p", "ul", "div"])
            if sibling:
                raw = sibling.get_text(separator=", ", strip=True)
                tags.extend(_split_tags(raw))
            if tags:
                break

    # Strategy 2 — look for a <div> or <section> with class/id hinting at keywords
    if not tags:
        for container in soup.find_all(["div", "section"], class_=re.compile(
            r"keyword|interest|research|topic|expertise", re.I
        )):
            raw = container.get_text(separator=", ", strip=True)
            tags.extend(_split_tags(raw))
            if tags:
                break

    # Strategy 3 — look for explicit "Keywords:" label inline
    if not tags:
        for elem in soup.find_all(string=re.compile(r"keywords?\s*:", re.I)):
            parent = elem.find_parent()
            if parent:
                raw = parent.get_text(strip=True)
                # Strip the "Keywords:" prefix
                raw = re.sub(r"^keywords?\s*:\s*", "", raw, flags=re.I)
                tags.extend(_split_tags(raw))
            if tags:
                break

    return _dedup(tags)


def _split_tags(text: str) -> list[str]:
    """Split a comma/semicolon/newline-separated string into individual tags."""
    # Replace common separators with commas
    text = re.sub(r"[;\n•·]", ",", text)
    parts = [t.strip().strip(".,") for t in text.split(",")]
    # Keep only plausible keyword strings: 1–60 chars, not pure numbers
    return [
        p for p in parts
        if 2 < len(p) <= 60 and not p.isdigit()
    ]


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


# ── Publication scraping ──────────────────────────────────────────────────────

def scrape_publications(soup: BeautifulSoup, fac_id: str) -> list[dict]:
    """
    Extract recent publications from a faculty profile page.
    Returns a list of dicts (title, year, pub_type, journal, url),
    capped at MAX_PUBLICATIONS, sorted by year descending.
    """
    pubs: list[dict] = []

    # HBS profile pages typically nest publications under section headings.
    # We walk through all headings and collect the items that follow each one
    # until the next heading of the same or higher level.

    headings = soup.find_all(["h2", "h3", "h4", "h5"])

    for idx, heading in enumerate(headings):
        heading_text = heading.get_text(strip=True).lower().rstrip("s")  # normalise plural

        # Match against known pub section names
        pub_type = None
        for pattern, ptype in PUB_SECTION_TYPES.items():
            if pattern.rstrip("s") in heading_text:
                pub_type = ptype
                break

        if pub_type is None:
            continue

        # Collect all siblings until the next heading
        siblings = []
        for sibling in heading.find_next_siblings():
            if sibling.name in ["h2", "h3", "h4", "h5"]:
                break
            siblings.append(sibling)

        # Each publication is typically a <li>, <p>, or <div> within siblings
        entries: list[BeautifulSoup] = []
        for sib in siblings:
            if sib.name in ["ul", "ol"]:
                entries.extend(sib.find_all("li"))
            elif sib.name in ["p", "div"]:
                entries.append(sib)

        for entry in entries:
            pub = _parse_pub_entry(entry, pub_type)
            if pub:
                pubs.append(pub)

    # Fallback: if nothing found via headings, try a generic publication list class
    if not pubs:
        for container in soup.find_all(class_=re.compile(
            r"pub|publication|research-item|work", re.I
        )):
            for item in container.find_all(["li", "p"]):
                pub = _parse_pub_entry(item, "Publication")
                if pub:
                    pubs.append(pub)

    # Sort by year desc, cap, dedup by title
    pubs = _dedup_pubs(pubs)
    pubs.sort(key=lambda p: p.get("year") or 0, reverse=True)
    return pubs[:MAX_PUBLICATIONS]


def _parse_pub_entry(entry: BeautifulSoup, pub_type: str) -> dict | None:
    """Parse a single publication entry element into a dict."""
    text = entry.get_text(separator=" ", strip=True)
    if len(text) < 10:
        return None

    # Title: prefer the text of the first <a> or <strong>/<b>, else first sentence
    title_tag = entry.find("a") or entry.find("strong") or entry.find("b")
    if title_tag:
        title = title_tag.get_text(strip=True)
        url = title_tag.get("href") if title_tag.name == "a" else None
        # Make relative URLs absolute
        if url and url.startswith("/"):
            url = "https://www.hbs.edu" + url
    else:
        # Fall back: first sentence of the text
        title = re.split(r"[.!?]", text)[0].strip()
        url = None

    if not title or len(title) < 5:
        return None

    # Year: find the first 4-digit year in the full text
    year_match = YEAR_RE.search(text)
    year = int(year_match.group()) if year_match else None

    # Journal: text between title and year (rough heuristic)
    journal = None
    if year_match:
        remainder = text[len(title):year_match.start()].strip(" ,.-")
        # Remove the title itself if it appears at the start
        if remainder.lower().startswith(title.lower()):
            remainder = remainder[len(title):].strip(" ,.-")
        if remainder and 2 < len(remainder) < 120:
            journal = remainder

    return {
        "title":    title,
        "year":     year,
        "pub_type": pub_type,
        "journal":  journal,
        "url":      url,
    }


def _dedup_pubs(pubs: list[dict]) -> list[dict]:
    seen: set[str] = set()
    result: list[dict] = []
    for pub in pubs:
        key = pub["title"].lower()[:80]
        if key not in seen:
            seen.add(key)
            result.append(pub)
    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("HBS Faculty Enrichment Scraper")
    print("=" * 50)
    print(f"Scraping {len(PILOT_FACULTY)} faculty members…\n")

    results = []

    for i, (fac_id, name) in enumerate(PILOT_FACULTY, 1):
        print(f"[{i:2}/{len(PILOT_FACULTY)}] {name} (facId={fac_id})")

        soup = fetch_profile(fac_id)
        if soup is None:
            results.append({"hbs_fac_id": fac_id, "tags": [], "publications": []})
            time.sleep(1)
            continue

        keywords = scrape_keywords(soup)
        publications = scrape_publications(soup, fac_id)

        print(f"         tags: {len(keywords)}   pubs: {len(publications)}")
        if keywords:
            print(f"         → {', '.join(keywords[:5])}{'…' if len(keywords) > 5 else ''}")

        results.append({
            "hbs_fac_id":   fac_id,
            "tags":         keywords,
            "publications": publications,
        })

        # Be polite to the HBS server
        time.sleep(1.5)

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    total_tags = sum(len(r["tags"]) for r in results)
    total_pubs = sum(len(r["publications"]) for r in results)

    print("\n" + "=" * 50)
    print(f"✅ Done!")
    print(f"   Tags scraped:         {total_tags}")
    print(f"   Publications scraped: {total_pubs}")
    print(f"   Output: {OUTPUT_FILE}")
    print()
    print("Next step: node scripts/import-enriched.mjs")


if __name__ == "__main__":
    main()
