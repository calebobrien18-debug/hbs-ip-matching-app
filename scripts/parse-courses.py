"""
parse-courses.py
================
Parses the raw text extracted from the HBS 2026-2027 Elective Curriculum PDF
into a clean JSON array for use by seed-courses.js.

Input:  scripts/courses_raw.txt
Output: scripts/courses_data.json

Run from repo root:
    python scripts/parse-courses.py
"""

import re
import json
from pathlib import Path

# ── Load and clean raw text ────────────────────────────────────────────────────

raw = Path('scripts/courses_raw.txt').read_text(encoding='utf-8', errors='replace')

def fix_encoding(s):
    """Fix common PDF-to-text encoding artifacts."""
    return (s
        .replace('\u00e2\u0080\u0099', "'")   # â€™ → '
        .replace('\u00e2\u0080\u009c', '"')   # â€œ → "
        .replace('\u00e2\u0080\u009d', '"')   # â€  → "
        .replace('\u00e2\u0080\u0093', '–')   # â€" → –
        .replace('\u00e2\u0080\u0094', '—')   # â€" → —
        .replace('\u00c2\u00a9', '©')          # Â© → ©
        .replace('\u00c2\u00a0', ' ')          # Â  → space
        .replace('\u00c2', '')                 # stray Â
        .replace('â€™', "'")
        .replace('â€œ', '"')
        .replace('â€\x9d', '"')
        .replace('â€"', '–')
        .replace('â€"', '—')
        .replace('Â©', '©')
        .replace('Â ', ' ')
        .replace('Â', '')
        .replace('^Â back to top', '')
        .replace('^back to top', '')
    )

raw = fix_encoding(raw)

# ── Known HBS unit areas (order: longer/more specific first) ──────────────────

AREA_PATTERNS = [
    r'Business,\s*Government\s*&\s*the\s*International\s*Economy',
    r'Technology\s*&\s*Operations\s*Management',
    r'Negotiation,\s*Organizations\s*&\s*Markets',
    r'Accounting\s*&\s*Management',
    r'Entrepreneurial\s*Management',
    r'Organizational\s*Behavior',
    r'General\s*Management',
    r'Marketing',
    r'Finance',
    r'Strategy',
    r'Health\s*Care',
    r'Healthcare',
]

SINGLE_AREA = '(?:' + '|'.join(AREA_PATTERNS) + ')'
MULTI_AREA  = SINGLE_AREA + r'(?:\s*,\s*' + SINGLE_AREA + r')*'
AREA_RE     = re.compile(MULTI_AREA, re.IGNORECASE)

# ── Part 1: find where tabular section ends and descriptions begin ─────────────
#
# Strategy: use the LAST "back to top" marker as the split point.  This ensures
# the very first description-section title ("3 Technologies that Will Change the
# World") ends up in desc_text where it can be extracted, rather than being
# silently swallowed by tabular_text.

_back_matches = list(re.finditer(r'back to top', raw, re.IGNORECASE))
if _back_matches:
    last_back = _back_matches[-1]
    # Move to the end of that line, then advance past the newline
    _eol = raw.find('\n', last_back.end())
    desc_start = (_eol + 1) if _eol != -1 else len(raw)
else:
    # Fall back to searching for the first "Course Number" anchor
    desc_start = raw.find('\nCourse Number ')
    if desc_start == -1:
        desc_start = raw.find('Course Number ')
    if desc_start == -1:
        print('WARNING: Could not find description section; only tabular data will be parsed.')
        desc_start = len(raw)

tabular_text = raw[:desc_start]
desc_text    = raw[desc_start:]

# ── Part 2: parse tabular section ─────────────────────────────────────────────
# Each course entry ends with:
#   (Fall|Spring|Winter|January) <optional-newline> YYYY (Q1Q2…|J) (1.5|3.0)

BLOCK_END_RE = re.compile(
    r'(Fall|Spring|Winter|January)\s*\n?\s*(20\d\d)\s+(Q[1-4](?:Q[1-4])?|J)\s+(1\.5|3\.0)'
)

tabular_entries = []
last_end = 0

for m in BLOCK_END_RE.finditer(tabular_text):
    term_season = m.group(1)
    term_year   = m.group(2)
    quarter     = m.group(3)
    credits     = float(m.group(4))

    # The content before this term marker belongs to this course
    block = tabular_text[last_end:m.start()].strip()
    last_end = m.end()

    if not block:
        continue

    # Collapse internal whitespace/newlines in the block
    block_flat = re.sub(r'\s+', ' ', block).strip()

    # ── Strip section separator noise ────────────────────────────────────────
    # "^ back to top" markers (with or without ^ or leading space)
    block_flat = re.sub(r'\^?\s*back to top\s*', ' ', block_flat, flags=re.I)
    # Section header rows: "[A-Z#] Area Faculty Name Term QuarterCredits"
    # Uses .*?Area to gobble up everything before "Area" (page header on first block).
    # The header is "Area Faculty Name Term<space>QuarterCredits<space>" so we need
    # \s* before \S* to consume the space between "Term" and "QuarterCredits".
    block_flat = re.sub(r'.*?Area Faculty Name Term\s*\S*\s*', '', block_flat, flags=re.I)
    block_flat = re.sub(r'\s+', ' ', block_flat).strip()

    # Skip if nothing useful remains
    if not block_flat:
        continue
    if re.match(r'(View by)', block_flat):
        continue

    # Find the area pattern — use the LAST match so that area words appearing
    # inside a course title (e.g. "Advanced Competitive Strategy") are skipped.
    all_area_matches = list(AREA_RE.finditer(block_flat))
    if not all_area_matches:
        continue   # no recognized area → skip (likely a header row)
    area_m = all_area_matches[-1]   # last match is the actual area field

    title_raw   = block_flat[:area_m.start()].strip().rstrip(',').strip()
    area_raw    = area_m.group(0).strip()
    faculty_raw = block_flat[area_m.end():].strip().lstrip(',').strip()

    # Normalize area (collapse internal whitespace)
    area = re.sub(r'\s+', ' ', area_raw)

    # Clean title
    title = re.sub(r'\s+', ' ', title_raw).strip()
    if not title or len(title) < 3:
        continue

    # Split faculty by comma, filter noise
    faculty_list = [
        re.sub(r'\s+', ' ', f).strip()
        for f in faculty_raw.split(',')
        if f.strip() and len(f.strip()) > 2
        and not re.match(r'^(Area|Faculty|Name|Term|Quarter|Credits)$', f.strip(), re.I)
    ]

    tabular_entries.append({
        'title':         title,
        'area':          area,
        'faculty':       faculty_list,
        'term':          f'{term_season} {term_year}',
        'quarter':       quarter,
        'credits':       credits,
        'course_number': None,
        'description':   None,
    })

print(f'Tabular section: parsed {len(tabular_entries)} course entries')

# ── Part 3: parse description section ─────────────────────────────────────────
# Format per course:
#   [Title lines]
#   Course Number XXXX
#   [Faculty lines with Professor/Senior Lecturer/etc.]
#   Fall; Q1Q2; 3.0 credits   (or Spring/Winter/January)
#   [Sessions + format]
#   [Overview / free-text description]
#   Copyright © 2026 ...

COURSE_NUM_RE  = re.compile(r'\nCourse Number\s+(\d+)\n')
COPYRIGHT_RE   = re.compile(r'Copyright\s*©?\s*20\d\d\s+President', re.IGNORECASE)
FACULTY_TITLE_RE = re.compile(
    r'^(?:Professor|Senior Lecturer|Lecturer|Associate Professor|'
    r'Assistant Professor|Adjunct|Visiting|John and Natty|Baker Foundation|'
    r'Professor of M anagement Practice|Professor of Management Practice)\s+',
    re.I
)
# Lines that are scheduling info, not description
SCHEDULING_RE = re.compile(
    r'^(Fall|Spring|Winter|January);|^\d+\s+[Ss]ession|^Overview$|^O verview$'
    r'|^Paper$|^Exam$|^Project$',
    re.I
)

desc_blocks = list(COURSE_NUM_RE.finditer(desc_text))
descriptions = {}  # course_number → {title, course_number, description}

for i, m in enumerate(desc_blocks):
    course_number = m.group(1)

    # Title: lines just before "Course Number" in this block's preceding text
    if i == 0:
        block_start = 0
    else:
        block_start = desc_blocks[i - 1].end()

    before = desc_text[block_start:m.start()]
    before_lines = [l.strip() for l in before.split('\n') if l.strip()]

    # Walk backward, collecting title lines until we hit scheduling/copyright noise.
    # In this PDF format the course title is almost always the very last line before
    # "Course Number XXXX", so we break as soon as we've captured one title-like line.
    title_lines = []
    for line in reversed(before_lines):
        # Hard stops: copyright, credit lines, term lines, scheduling noise
        if re.search(
            r'Copyright|Reserved'
            r'|^\d+\s+credit'
            r'|^(Fall|Spring|Winter|January)[;\s|]'
            r'|^\d+\s+[Ss]essions?'          # "28 sessions", "14 sessions"
            r'|^\d+[A-Za-z]'                 # "27Paper", "12sessions" run-together
            r'|^(Paper|Exam|Project|Optional|Participation)[\s/\|]'  # grading types
            r'|^(Paper|Exam|Project)$'        # standalone grading keywords
            r'|^(O verview|Overview|Career Focus|Educational Objectives?'
            r'|Course Content|Grading|Evaluation|Faculty Assistant'
            r'|Course Description|Note:|Note —)\b'
            r'|\d+%'                          # grading percentages
            r'|^Class\s+(Participation|Discussion)'
            r'|^Written?\s+(Assignment|Report|Case)',
            line, re.I
        ):
            break
        if FACULTY_TITLE_RE.match(line):
            break
        # Stop on long prose lines (description sentences spilling backward)
        if len(line) > 100:
            break
        # Stop on lines that start with a lowercase letter — those are keyword
        # continuations or prose, never a course title
        if title_lines and line and line[0].islower():
            break
        title_lines.insert(0, line)
        # The title is virtually always a single line; once we have a line that
        # starts with an uppercase letter or digit, stop — don't keep walking
        # backward into keyword lists or previous description prose
        if line and (line[0].isupper() or line[0].isdigit()) and len(line) >= 4:
            break

    desc_title = ' '.join(title_lines).strip()

    # Description content: from after "Course Number XXXX\n" to next block or copyright
    if i + 1 < len(desc_blocks):
        content_end = desc_blocks[i + 1].start()
        content_raw = desc_text[m.end():content_end]
    else:
        content_raw = desc_text[m.end():]

    copy_m = COPYRIGHT_RE.search(content_raw)
    if copy_m:
        content_raw = content_raw[:copy_m.start()]

    # Strip faculty title lines and scheduling lines from the start of the description
    content_lines = content_raw.split('\n')
    desc_lines = []
    skip_header = True
    for line in content_lines:
        stripped = line.strip()
        if not stripped:
            if not skip_header:
                desc_lines.append('')
            continue
        if skip_header:
            if FACULTY_TITLE_RE.match(stripped) or SCHEDULING_RE.match(stripped):
                continue
            # Also skip bare name lines that look like faculty without titles
            # (e.g. "Russell J Wilcox") that sometimes follow faculty title lines
            elif re.match(r'^[A-Z][a-z]+(\s+[A-Z]\.?)+\s+[A-Z][a-z]+$', stripped):
                continue
            else:
                skip_header = False
        desc_lines.append(stripped)

    description = ' '.join(l for l in desc_lines if l).strip()
    description = re.sub(r'\s+', ' ', description).strip()

    if desc_title or description:
        descriptions[course_number] = {
            'title':         desc_title,
            'course_number': course_number,
            'description':   description,
        }

print(f'Description section: parsed {len(descriptions)} course descriptions')

# ── Part 4: match descriptions to tabular entries by title ────────────────────

def normalize(t):
    """Lowercase, alphanumeric only — for fuzzy title matching."""
    return re.sub(r'[^a-z0-9]', '', t.lower())

desc_by_norm = {normalize(d['title']): d for d in descriptions.values() if d['title']}
# Also index by course_number for direct lookup
desc_by_num  = {d['course_number']: d for d in descriptions.values()}

matched = 0
for entry in tabular_entries:
    norm = normalize(entry['title'])
    hit = desc_by_norm.get(norm)

    if not hit:
        # Prefix match: try prefix lengths from 25 down to 12 chars
        for prefix_len in (25, 20, 15, 12):
            if len(norm) < prefix_len:
                continue
            norm_prefix = norm[:prefix_len]
            for dn, d in desc_by_norm.items():
                if norm.startswith(dn[:prefix_len]) or dn.startswith(norm_prefix):
                    hit = d
                    break
            if hit:
                break

    if hit:
        entry['description']   = hit['description']
        entry['course_number'] = hit['course_number']
        matched += 1

print(f'Matched descriptions to {matched}/{len(tabular_entries)} tabular entries')

# ── Part 5: write output ───────────────────────────────────────────────────────

out_path = Path('scripts/courses_data.json')
out_path.write_text(
    json.dumps(tabular_entries, indent=2, ensure_ascii=False),
    encoding='utf-8'
)

print(f'\nWritten {len(tabular_entries)} courses to {out_path}')
print('\nFirst 3 entries:')
for e in tabular_entries[:3]:
    print(json.dumps(e, indent=2, ensure_ascii=False))
