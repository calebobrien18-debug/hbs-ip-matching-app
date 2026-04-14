"""
HBS Course Catalog Parser
==========================
Parses the HBS course catalog PDF and extracts structured course data.

Usage:
    cd scripts
    python parse_course_catalog.py [path/to/catalog.pdf]

Default PDF path: ~/OneDrive/Desktop/Print View - Course Catalog - Harvard Business School.pdf
Output: scripts/courses.json
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

# ── Configuration ─────────────────────────────────────────────────────────────

DEFAULT_PDF = (
    Path.home()
    / "OneDrive"
    / "Desktop"
    / "Print View - Course Catalog - Harvard Business School.pdf"
)
OUTPUT_FILE = Path(__file__).parent / "courses.json"

# Map season → full term label (based on 2026-2027 academic year)
TERM_YEAR = {
    "Fall":   "Fall 2026",
    "Winter": "Winter 2027",
    "Spring": "Spring 2027",
}

# Lines that indicate faculty role prefixes
FACULTY_PREFIX_RE = re.compile(
    r"^(Professor|Senior Lecturer|Lecturer|Associate Professor|"
    r"Associate Senior Lecturer|Baker Foundation Professor|"
    r"Visiting Professor|Adjunct Professor|Adjunct Lecturer)\s+(.+)$"
)

# Metadata lines to skip when looking for description text
METADATA_RE = re.compile(
    r"^\d+\s+[Ss]essions?$"
    r"|^(Exam|Paper|Optional|Exam or paper|Take-home exam|No examination)$"
    r"|^Enrollment:"
    r"|^Requirements?:"
    r"|^Course Format$"
    r"|^Grading"
    r"|^Copyright"
)

# Section headings that end the description
SECTION_HEADING_RE = re.compile(
    r"^(Career Focus|Educational Objectives?|Course Content|Grading|"
    r"Course Format|Purpose|Overview|Requirements?|Enrollment|"
    r"Course Content Keywords?)\b",
    re.I,
)


# ── Parsing ────────────────────────────────────────────────────────────────────

def extract_text(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        parts = []
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
    return "\n".join(parts)


def parse_all_courses(full_text: str) -> list[dict]:
    """
    Split the full text on 'Course Number XXXX' markers.
    Each marker begins a new course block; the title is the text
    immediately preceding the marker.
    """
    # Find all Course Number positions
    cn_matches = list(re.finditer(r"^Course Number\s+(\d+)", full_text, re.MULTILINE))
    if not cn_matches:
        return []

    courses = []
    for i, match in enumerate(cn_matches):
        cn_start = match.start()
        cn_end   = cn_matches[i + 1].start() if i + 1 < len(cn_matches) else len(full_text)

        # Title: text between the previous boundary and this Course Number line
        prev_end = cn_matches[i - 1].start() if i > 0 else 0
        between  = full_text[prev_end:cn_start]

        title = _extract_title(between)
        block = full_text[cn_start:cn_end]

        course = _parse_block(block, title)
        if course:
            courses.append(course)

    return courses


def _extract_title(text: str) -> str:
    """
    The course title always appears immediately before 'Course Number XXXX'.
    Strategy: strip artifacts, take only the last few non-empty lines,
    then discard any that look like prose from the previous course.
    """
    # Strip copyright lines and page chrome
    cleaned = re.sub(r"Copyright[^\n]*\n?", "", text)
    cleaned = re.sub(
        r"(Print View|View by Unit|View by Course Title|Last Updated)[^\n]*\n?",
        "", cleaned, flags=re.I,
    )
    cleaned = re.sub(r"^#\s+A\s+B\s+.*$", "", cleaned, flags=re.MULTILINE)
    # Replace "back to top" with a sentinel so we can split on section breaks
    cleaned = re.sub(r"^\^?\s*back to top\s*$", "\x00BREAK\x00", cleaned, flags=re.MULTILINE | re.I)

    # If there are section breaks, only look at text after the last one —
    # this prevents the summary-listing table at the top of the PDF from
    # contaminating the first course's title.
    if "\x00BREAK\x00" in cleaned:
        cleaned = cleaned.split("\x00BREAK\x00")[-1]

    non_empty = [l.strip() for l in cleaned.split("\n") if l.strip()]
    if not non_empty:
        return ""

    # Only consider the last 5 non-empty lines — the title is always here
    window = non_empty[-5:]

    NOT_TITLE_RE = re.compile(
        r"^(Exam|Paper|Optional|Exam or paper|Take-home exam|No examination)\s*$"
        r"|^\d+\s+[Ss]essions?"
        r"|^(Career Focus|Educational|Course Content|Grading|Overview|Requirements?|Enrollment|Purpose)\b"
        r"|^Course Content Keywords?"
        r"|credits?"
        r"|^\^?\s*back to top"
        r"|\d+(\.\d+)?%",   # grade-weight lines like "Class Participation 38.5%"
        re.I,
    )

    title_lines = []
    for line in reversed(window):
        # Skip metadata lines
        if NOT_TITLE_RE.search(line):
            if title_lines:
                break
            continue
        # Skip comma-heavy lines (course keyword lists, summary listing data)
        if line.count(",") >= 3:
            if title_lines:
                break
            continue
        # Stop at prose lines (lowercase start OR >14 words)
        if line[0].islower() or len(line.split()) > 14:
            if title_lines:
                break
            continue
        title_lines.insert(0, line)

    title = " ".join(title_lines).strip()
    # Strip trailing quarter designations that sometimes leak from summary listings
    # e.g. "Entrepreneurial Finance (Q2)" → "Entrepreneurial Finance"
    title = re.sub(r"\s*\(Q[\w]+\)\s*$", "", title, flags=re.I)
    return title


def _parse_block(block: str, title: str) -> dict | None:
    """Extract structured fields from a course block."""
    if not title:
        return None

    lines = [l.strip() for l in block.split("\n") if l.strip()]

    faculty_names = []
    season        = None
    quarter       = None
    credits       = None
    description   = None

    # Track where metadata ends so we can find description
    metadata_done = False
    desc_lines    = []
    in_overview   = False

    for i, line in enumerate(lines):
        # Skip the Course Number line itself
        if re.match(r"^Course Number\s+\d+", line):
            continue

        # Faculty
        fm = FACULTY_PREFIX_RE.match(line)
        if fm:
            name = fm.group(2).strip().rstrip(",")
            # Strip descriptive role qualifiers before the actual name
            # e.g. "of Management Practice Shikhar Ghosh" → "Shikhar Ghosh"
            if name.lower().startswith("of "):
                # Find actual name: last 2-3 words (First [M.] Last)
                words = name.split()
                if len(words) >= 4:
                    # Check if 3rd-from-last is a middle initial
                    if re.match(r"^[A-Z]\.?$", words[-2]):
                        name = " ".join(words[-3:])
                    else:
                        name = " ".join(words[-2:])
            # Guard against description bleed-through — real names have ≤5 words
            if len(name.split()) > 5:
                continue
            faculty_names.append(name)
            continue

        # Term / quarter / credits:  "Fall; Q1Q2; 3.0 credits"
        tm = re.match(
            r"^(Fall|Spring|Winter)\s*;\s*(Q[\w]+)\s*;\s*([\d.]+)\s*credits?",
            line, re.I
        )
        if tm:
            season  = tm.group(1).capitalize()
            quarter = tm.group(2).upper()
            credits = float(tm.group(3))
            continue

        # Skip metadata lines
        if METADATA_RE.match(line):
            continue

        # Overview: section — capture until next heading
        if re.match(r"^Overview\s*:?$", line, re.I):
            in_overview   = True
            metadata_done = True
            continue

        if in_overview:
            if SECTION_HEADING_RE.match(line):
                break
            desc_lines.append(line)
            continue

        # No Overview: — collect first paragraph of substantive text
        if not in_overview and not metadata_done and season is not None:
            # We're past the metadata — start collecting description
            if not SECTION_HEADING_RE.match(line) and not METADATA_RE.match(line):
                metadata_done = True
                desc_lines.append(line)
            continue

        if metadata_done and not in_overview:
            if SECTION_HEADING_RE.match(line):
                break
            if not METADATA_RE.match(line):
                desc_lines.append(line)

    if not faculty_names:
        return None

    # Join description and trim to ~600 chars at a sentence boundary
    raw_desc = " ".join(desc_lines).strip()
    description = _trim_description(raw_desc, max_chars=600)

    return {
        "title":         title,
        "faculty_names": faculty_names,
        "term":          TERM_YEAR.get(season) if season else None,
        "quarter":       quarter,
        "credits":       credits,
        "description":   description or None,
    }


def _trim_description(text: str, max_chars: int = 600) -> str:
    """Trim description to max_chars at the nearest sentence end."""
    if not text or len(text) <= max_chars:
        return text
    # Find last sentence end within limit
    truncated = text[:max_chars]
    last_period = max(truncated.rfind(". "), truncated.rfind(".\n"))
    if last_period > max_chars * 0.5:
        return truncated[: last_period + 1].strip()
    return truncated.rstrip() + "…"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        print("Usage: python parse_course_catalog.py [path/to/catalog.pdf]")
        sys.exit(1)

    print(f"Parsing: {pdf_path.name}")
    full_text = extract_text(pdf_path)

    print("Extracting courses…")
    courses = parse_all_courses(full_text)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

    total_faculty = sum(len(c["faculty_names"]) for c in courses)
    has_desc      = sum(1 for c in courses if c["description"])
    has_term      = sum(1 for c in courses if c["term"])

    print(f"\nExtracted {len(courses)} courses")
    print(f"  Faculty references: {total_faculty}")
    print(f"  With description:   {has_desc}")
    print(f"  With term:          {has_term}")
    print(f"\nOutput: {OUTPUT_FILE}")
    print("Next step: node scripts/import-courses.mjs")

    # Preview first 5
    print("\n--- Preview (first 5) ---")
    for c in courses[:5]:
        print(f"  {c['title'][:60]}")
        print(f"    faculty: {', '.join(c['faculty_names'])}")
        print(f"    term: {c['term']}  quarter: {c['quarter']}  credits: {c['credits']}")
        print(f"    desc: {(c['description'] or '')[:80]}…")


if __name__ == "__main__":
    main()
