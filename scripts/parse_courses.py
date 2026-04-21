"""
HBS Elective Curriculum PDF Parser
Extracts all courses from the 2026-2027 HBS Course Catalog PDF.

PDF structure:
  Pages 1-8:  Index table (title | unit | faculty | term | quarter | credits per row)
  Pages 9+:   Full course descriptions

Index format (3-column layout merged by pdfplumber):
  The "anchor" line contains faculty name + quarter + credits (no term year).
  Adjacent lines (before/after) contain title words, unit words, and the year.

Description format:
  <Title line(s)>
  Course Number XXXX
  [Title prefix] Faculty Name   (one per faculty member)
  Fall/Spring/January; Qx; N.N credits
  N Sessions
  [description text...]
  Copyright ...
"""

import pdfplumber
import json
import re
import sys
from pathlib import Path

PDF_PATH = r"C:\Users\caleb\OneDrive\Desktop\Print View - Course Catalog - Harvard Business School.pdf"
OUTPUT_PATH = r"C:\Users\caleb\repos\hbs-ip-matching-app\scripts\courses_raw.json"

# ── Known HBS unit names (order matters: longer first) ──────────────────────
KNOWN_UNITS = [
    "Business, Government & the International Economy",
    "Technology & Operations Management",
    "Negotiation, Organizations & Markets",
    "Accounting and Management",
    "Accounting & Management",
    "Entrepreneurial Management",
    "Organizational Behavior",
    "General Management",
    "Finance",
    "Marketing",
    "Strategy",
]

# Faculty title prefixes used in description pages
FACULTY_PREFIXES = [
    "Thomas S. Murphy Senior Lecturer",
    "University Professor",
    "Baker Foundation Professor",
    "Associate Professor",
    "Assistant Professor",
    "Executive Fellow",
    "Senior Lecturer",
    "Senior Fellow",
    "Lecturer",
    "Professor",
]

COURSE_NUMBER_RE = re.compile(r'^Course Number\s+(\d+)\s*$')
TERM_LINE_RE = re.compile(
    r'^(Fall|Spring|January|Full\s+Year)[^;]*;\s*'
    r'(Q[1-4](?:Q[1-4])?|J)\s*;\s*([\d.]+)\s+credits?',
    re.IGNORECASE
)
COPYRIGHT_RE = re.compile(r'Copyright\s*[©\xa9]?\s*\d{4}', re.IGNORECASE)
TERM_YEAR_RE = re.compile(r'\b(Fall\s+20\d\d|Spring\s+20\d\d|January\s+20\d\d)\b', re.IGNORECASE)
QUARTER_RE = re.compile(r'\b(Q[1-4](?:Q[1-4])?|J)\b')
CREDITS_RE = re.compile(r'\b(\d\.?\d*)\s+credits?\b', re.IGNORECASE)
CREDITS_FLOAT_RE = re.compile(r'\b(\d\.\d)\b')

# ── Helpers ──────────────────────────────────────────────────────────────────

def normalize_term(raw):
    raw = raw.strip()
    if re.search(r'fall', raw, re.I):
        return 'Fall 2026'
    if re.search(r'spring', raw, re.I):
        return 'Spring 2027'
    if re.search(r'january', raw, re.I):
        return 'January 2027'
    if re.search(r'full\s*year', raw, re.I):
        return 'Full Year'
    return raw


def strip_faculty_prefix(line):
    """Remove faculty title prefix and return just the name."""
    for prefix in FACULTY_PREFIXES:
        if line.lower().startswith(prefix.lower()):
            return line[len(prefix):].strip()
    return None  # Not a faculty line


def find_unit(text):
    """Return the best matching unit found in text, or None."""
    for unit in KNOWN_UNITS:
        # Try exact match, then with & <-> and substitution
        if re.search(re.escape(unit), text, re.IGNORECASE):
            return unit if unit != "Accounting & Management" else "Accounting and Management"
        alt = unit.replace(' & ', ' and ').replace(' and ', ' & ')
        if re.search(re.escape(alt), text, re.IGNORECASE):
            # Normalize to canonical form
            if 'accounting' in unit.lower():
                return 'Accounting and Management'
            return unit
    return None


# ── Step 1: Extract all page texts ───────────────────────────────────────────

def extract_pages(pdf_path):
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f"Total pages: {total}", file=sys.stderr)
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages


# ── Step 2: Parse description pages (pages 9-137) ────────────────────────────

def parse_descriptions(pages):
    """
    Parse pages index 8..end as one contiguous stream of lines.
    Detect course boundaries by 'Course Number XXXX'.
    Return list of raw course dicts.
    """
    DESC_START = 8  # 0-indexed

    # Build line list with page tags for debugging
    all_lines = []  # list of (page_idx, line_text)
    for page_idx in range(DESC_START, len(pages)):
        for line in pages[page_idx].splitlines():
            all_lines.append((page_idx, line.rstrip()))

    courses = []
    i = 0
    n = len(all_lines)

    while i < n:
        _, line = all_lines[i]
        stripped = line.strip()

        cn_m = COURSE_NUMBER_RE.match(stripped)
        if not cn_m:
            i += 1
            continue

        course_number = cn_m.group(1)

        # ── Extract title: look back through previous lines ───────────────
        # Title ends just before "Course Number"; may span 1-3 lines.
        # Stop looking back if we hit: copyright, very long prose, empty after 4,
        # another course number, or a term line.
        title_parts = []
        j = i - 1
        while j >= 0 and (i - j) <= 6:
            _, prev = all_lines[j]
            p = prev.strip()
            if not p:
                j -= 1
                continue
            # Stop conditions
            if COPYRIGHT_RE.search(p):
                break
            if COURSE_NUMBER_RE.match(p):
                break
            if TERM_LINE_RE.match(p):
                break
            # Stop if looks like a prose sentence (long line, lowercase start)
            if len(p) > 100 and p[0].islower():
                break
            # Stop if looks like a section heading that belongs to previous course
            if p in ('Overview:', 'Overview', 'Career Focus', 'Educational Objectives',
                     'Course Content and Organization', 'Grading / Course Administration',
                     'Course Content Keywords', 'Overview\n', 'Paper', 'Exam'):
                break
            # Looks like title text - insert at front (we're going backwards)
            title_parts.insert(0, p)
            j -= 1

        title = ' '.join(title_parts).strip()
        title = re.sub(r'\s+', ' ', title).strip()

        # ── Extract faculty and term/quarter/credits ──────────────────────
        faculty = []
        term = None
        quarter = None
        credits = None

        k = i + 1
        while k < n and (k - i) < 25:
            _, nline = all_lines[k]
            nl = nline.strip()
            if not nl:
                k += 1
                continue

            # Term line
            tm = TERM_LINE_RE.match(nl)
            if tm:
                term = normalize_term(tm.group(1))
                quarter = tm.group(2).strip()
                credits = float(tm.group(3))
                k += 1
                break

            # Faculty line
            name = strip_faculty_prefix(nl)
            if name is not None:
                if name:
                    faculty.append(name)
                k += 1
                continue

            # If it doesn't look like faculty or term, might be a note or session count
            k += 1

        # ── Collect description text ──────────────────────────────────────
        desc_lines = []
        while k < n:
            _, dline = all_lines[k]
            d = dline.strip()

            if COURSE_NUMBER_RE.match(d):
                break
            if COPYRIGHT_RE.search(d):
                k += 1
                break

            desc_lines.append(d)
            k += 1

        description = ' '.join(l for l in desc_lines if l).strip()
        description = re.sub(r'\s+', ' ', description)

        if course_number:
            courses.append({
                '_title': title,
                'course_number': course_number,
                '_faculty': faculty,
                '_term': term,
                '_quarter': quarter,
                '_credits': credits,
                'description': description,
            })

        i = k

    return courses


# ── Step 3: Parse index pages for unit + faculty (authoritative) ──────────────

def parse_index(pages):
    """
    Parse the first 8 pages (index) to extract:
      - course title
      - unit
      - faculty list
      - term, quarter, credits

    Returns a list of index entry dicts.
    """
    INDEX_END = 8
    entries = []

    for page_idx in range(INDEX_END):
        lines = [l.rstrip() for l in pages[page_idx].splitlines()]

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # The anchor line has quarter + credits but NOT a term year
            q_m = QUARTER_RE.search(line)
            c_m = CREDITS_FLOAT_RE.search(line)
            has_year = bool(TERM_YEAR_RE.search(line))

            if q_m and c_m and not has_year and line not in (
                '# Area Faculty Name Term Quarter Credits',
                'A Area Faculty Name Term Quarter Credits',
            ) and not line.startswith('^ back'):

                quarter = q_m.group(1)
                credits_val = float(c_m.group(1))

                # Gather a window of surrounding lines for context
                window = []
                for j in range(max(0, i - 5), min(len(lines), i + 4)):
                    l = lines[j].strip()
                    if l and not l.startswith('^') and not re.match(r'^[A-Z#]\s+Area', l):
                        window.append(l)

                window_str = ' '.join(window)

                # Find term year in the window
                ty_m = TERM_YEAR_RE.search(window_str)
                if ty_m:
                    term = normalize_term(ty_m.group(1))
                else:
                    term = None

                # Find unit
                unit = find_unit(window_str)

                # Extract faculty names from window
                # Faculty appear without title prefix in index (just "Firstname Lastname")
                # We'll collect them from lines around the anchor that aren't unit/title text
                faculty_candidates = []
                for wl in window:
                    # Skip lines that are clearly part of title or unit
                    if find_unit(wl):
                        continue
                    if TERM_YEAR_RE.search(wl):
                        continue
                    if CREDITS_FLOAT_RE.search(wl) or QUARTER_RE.search(wl):
                        # This is the anchor line; extract faculty from it by removing
                        # quarter, credits and any unit text
                        fac_part = wl
                        if unit:
                            fac_part = re.sub(re.escape(unit), '', fac_part, flags=re.IGNORECASE)
                        fac_part = re.sub(QUARTER_RE, '', fac_part)
                        fac_part = re.sub(CREDITS_FLOAT_RE, '', fac_part)
                        fac_part = fac_part.strip().rstrip(',').strip()
                        if fac_part and len(fac_part) > 2:
                            # May be "Name1, Name2" or "Name1 Name2"
                            parts = re.split(r',\s*', fac_part)
                            for p in parts:
                                p = p.strip()
                                if p and len(p) > 2:
                                    faculty_candidates.append(p)

                # Store as entry with the full window for later title matching
                entries.append({
                    'term': term,
                    'quarter': quarter,
                    'credits': credits_val,
                    'unit': unit,
                    'faculty_candidates': faculty_candidates,
                    'window': window_str,
                    'page': page_idx + 1,
                })

            i += 1

    return entries


# ── Step 4: Build a reliable title->unit map from the index ──────────────────

def build_unit_map(index_entries, desc_courses):
    """
    For each description course, find the best matching index entry
    to get the unit. Match on: title words overlap + term + quarter + credits.
    Returns dict: course_number -> unit
    """

    def title_words(s):
        s = s.lower()
        s = re.sub(r'[^\w\s]', ' ', s)
        stop = {'the', 'a', 'an', 'and', 'or', 'of', 'in', 'for', 'to', 'on', 'at',
                'by', 'with', 'from', 'is', 'its', 'as', 'be', 'are', 'was', 'were'}
        return set(s.split()) - stop

    unit_map = {}  # course_number -> unit

    for course in desc_courses:
        cn = course['course_number']
        title = course['_title']
        term = course['_term']
        quarter = course['_quarter']
        credits = course['_credits']

        if not title:
            unit_map[cn] = ''
            continue

        tw = title_words(title)
        if not tw:
            unit_map[cn] = ''
            continue

        best_unit = None
        best_score = -1

        for entry in index_entries:
            # Quick filter: must have same quarter and credits
            if entry['quarter'] != quarter:
                continue
            if credits is not None and abs(entry['credits'] - credits) > 0.05:
                continue

            # Term match (with tolerance for None)
            if term and entry['term'] and entry['term'] != term:
                continue

            # Title overlap with window
            ew = title_words(entry['window'])
            overlap = len(tw & ew)
            if overlap == 0:
                continue

            # Score: fraction of title words found in index window
            score = overlap / len(tw)
            if score > best_score:
                best_score = score
                best_unit = entry.get('unit')

        if best_score >= 0.4:
            unit_map[cn] = best_unit or ''
        else:
            # Fallback: search description text for unit
            unit_from_desc = find_unit(course['description'])
            unit_map[cn] = unit_from_desc or ''

    return unit_map


# ── Step 5: Build faculty map from index (more reliable than desc) ────────────

def build_faculty_map(index_entries, desc_courses):
    """
    Some courses have faculty listed in the index that may be cleaner.
    Primarily rely on description page faculty since it's more structured.
    This is a supplemental fallback.
    """
    # Actually, description faculty is extracted with full name (after stripping title).
    # Index faculty can be messy (no title prefix). We'll use desc faculty as primary.
    return {}


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("Loading PDF...", file=sys.stderr)
    pages = extract_pages(PDF_PATH)

    print("Parsing course descriptions...", file=sys.stderr)
    desc_courses = parse_descriptions(pages)
    print(f"  Found {len(desc_courses)} raw description entries", file=sys.stderr)

    print("Parsing index pages...", file=sys.stderr)
    index_entries = parse_index(pages)
    print(f"  Found {len(index_entries)} index rows", file=sys.stderr)

    print("Matching units...", file=sys.stderr)
    unit_map = build_unit_map(index_entries, desc_courses)

    # ── Assemble final courses ────────────────────────────────────────────
    final_courses = []
    seen_numbers = {}  # to detect duplicates (same course, diff sections)

    for course in desc_courses:
        cn = course['course_number']
        title = course['_title']
        faculty = course['_faculty']
        term = course['_term'] or ''
        quarter = course['_quarter'] or ''
        credits = course['_credits'] if course['_credits'] is not None else 0
        description = course['description']
        unit = unit_map.get(cn, '')

        # Clean up title artifacts
        # Remove session counts accidentally captured
        title = re.sub(r'^\d+\s+Sessions?\s*', '', title, flags=re.IGNORECASE).strip()
        title = re.sub(r'\s*Course description to come\.?\s*', '', title, flags=re.IGNORECASE).strip()
        title = re.sub(r'\s+', ' ', title).strip()

        final_courses.append({
            'title': title,
            'course_number': cn,
            'faculty': faculty,
            'unit': unit,
            'term': term,
            'quarter': quarter,
            'credits': credits,
            'description': description,
        })

    # Sort for readability
    final_courses.sort(key=lambda c: (c['term'], c['title'].lower()))

    # ── Save output ───────────────────────────────────────────────────────
    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_courses, f, indent=2, ensure_ascii=False)

    # ── Report ────────────────────────────────────────────────────────────
    print(f"\nExtracted {len(final_courses)} courses → {OUTPUT_PATH}")
    print("\nFirst 3 entries:")
    for c in final_courses[:3]:
        print(json.dumps(c, indent=2, ensure_ascii=False))

    # Stats
    missing_unit = sum(1 for c in final_courses if not c['unit'])
    missing_title = sum(1 for c in final_courses if not c['title'])
    missing_faculty = sum(1 for c in final_courses if not c['faculty'])
    print(f"\nStats: missing_unit={missing_unit}, missing_title={missing_title}, "
          f"missing_faculty={missing_faculty}")

    return final_courses


if __name__ == '__main__':
    main()
