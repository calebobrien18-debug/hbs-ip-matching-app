"""
parse-courses.py
================
CANONICAL course parser for the HBS 2026-2027 Elective Curriculum.

Pipeline (run from repo root):
  1. python scripts/parse-courses.py   → writes scripts/courses_data.json
                                         writes scripts/course_parse_review.json
  2. node scripts/seed-courses.js      → seeds faculty_courses table

Input:  scripts/courses_raw.txt
Output: scripts/courses_data.json          (all parsed courses)
        scripts/course_parse_review.json   (suspicious rows for manual review)
"""

import re
import json
from pathlib import Path

# ── Text normalization / encoding fixes ───────────────────────────────────────

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


def normalize_raw_text(s):
    """
    Fix common PDF extraction artifacts before main parsing.
    Handles merged tokens, split words, and whitespace inconsistencies.
    """
    # Non-breaking / zero-width space variants → regular space
    s = s.replace('\u00a0', ' ').replace('\xa0', ' ').replace('\ufeff', '')

    # Split section headings (PDF extractor inserts space mid-word):
    #   "O verview" → "Overview", "O bjectives" → "Objectives"
    s = re.sub(r'\bO\s+verview\b', 'Overview', s, flags=re.I)
    s = re.sub(r'\bO\s+bjective', 'Objective', s, flags=re.I)
    s = re.sub(r'\bO\s+rganization', 'Organization', s, flags=re.I)
    s = re.sub(r'\bD\s+escription\b', 'Description', s, flags=re.I)
    s = re.sub(r'\bA\s+dministration\b', 'Administration', s, flags=re.I)

    # Merged common prepositions/articles: "Plansfor Innovating" → "Plans for Innovating"
    # "comewith the" → "come with the", "withthe" → "with the"
    # Pattern: lowercase letter immediately before the word, no preceding space
    for _word in ('for', 'with', 'the', 'this', 'that', 'from', 'into', 'onto'):
        s = re.sub(r'([a-z])(' + _word + r')(\s)', r'\1 \2\3', s, flags=re.I)

    # Merged faculty-title tokens: "ZlatevProfessor" → "Zlatev Professor"
    # Matches lowercase char immediately before a known title keyword (uppercase start).
    _TITLE_KW = (r'(?:Professor|Senior\s+Lecturer|Lecturer|'
                 r'Associate\s+Professor|Assistant\s+Professor|Adjunct|Visiting)')
    s = re.sub(r'([a-z])(' + _TITLE_KW + r')', r'\1 \2', s)

    # Merged session/exam tokens: "28sessionsExam" → "28 sessions Exam"
    s = re.sub(r'(\d+)\s*([Ss]essions?)\s*([A-Z])', r'\1 \2 \3', s)
    s = re.sub(r'([a-z])(Exam\b|Paper\b)', r'\1 \2', s)

    # Ensure space after semicolons in schedule tokens: "Fall;Q1Q2" → "Fall; Q1Q2"
    s = re.sub(r';(\S)', r'; \1', s)

    # Collapse repeated horizontal whitespace
    s = re.sub(r'[ \t]{2,}', ' ', s)

    return s


# ── Load and clean raw text ────────────────────────────────────────────────────

raw = Path('scripts/courses_raw.txt').read_text(encoding='utf-8', errors='replace')
raw = fix_encoding(raw)
raw = normalize_raw_text(raw)

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
# Strategy: use the LAST "back to top" marker as the split point.

_back_matches = list(re.finditer(r'back to top', raw, re.IGNORECASE))
if _back_matches:
    last_back = _back_matches[-1]
    _eol = raw.find('\n', last_back.end())
    desc_start = (_eol + 1) if _eol != -1 else len(raw)
else:
    desc_start = raw.find('\nCourse Number ')
    if desc_start == -1:
        desc_start = raw.find('Course Number ')
    if desc_start == -1:
        print('WARNING: Could not find description section; only tabular data will be parsed.')
        desc_start = len(raw)

tabular_text = raw[:desc_start]
desc_text    = raw[desc_start:]

# ── Part 2: parse tabular section ─────────────────────────────────────────────
# Each course entry ends with: (Fall|Spring|Winter|January) YYYY (Q1Q2…|J) (1.5|3.0)

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

    block = tabular_text[last_end:m.start()].strip()
    last_end = m.end()

    if not block:
        continue

    block_flat = re.sub(r'\s+', ' ', block).strip()
    block_flat = re.sub(r'\^?\s*back to top\s*', ' ', block_flat, flags=re.I)
    block_flat = re.sub(r'.*?Area Faculty Name Term\s*\S*\s*', '', block_flat, flags=re.I)
    block_flat = re.sub(r'\s+', ' ', block_flat).strip()

    if not block_flat:
        continue
    if re.match(r'(View by)', block_flat):
        continue

    all_area_matches = list(AREA_RE.finditer(block_flat))
    if not all_area_matches:
        continue
    area_m = all_area_matches[-1]

    title_raw   = block_flat[:area_m.start()].strip().rstrip(',').strip()
    area_raw    = area_m.group(0).strip()
    faculty_raw = block_flat[area_m.end():].strip().lstrip(',').strip()

    area  = re.sub(r'\s+', ' ', area_raw)
    title = re.sub(r'\s+', ' ', title_raw).strip()
    if not title or len(title) < 3:
        continue

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

COURSE_NUM_RE = re.compile(r'\nCourse Number\s+(\d+)\n')
COPYRIGHT_RE  = re.compile(r'Copyright\s*©?\s*20\d\d\s+President', re.IGNORECASE)

# Matches lines that start with a faculty title prefix — used to skip these lines
FACULTY_TITLE_RE = re.compile(
    r'^(?:Professor|Senior Lecturer|Lecturer|Associate Professor|'
    r'Assistant Professor|Adjunct|Visiting|John and Natty|Baker Foundation|'
    r'Professor of M anagement Practice|Professor of Management Practice)\s+',
    re.I
)

# Lines that are scheduling/enrollment/grading metadata — filter from descriptions
# throughout (not just in the header), since they contaminate the description text.
SCHEDULING_RE = re.compile(
    r'^(Fall|Spring|Winter|January)[;\s|,]'          # term lines
    r'|^\d+\s+[Ss]ession'                            # "28 sessions…"
    r'|^O?\s*verview\s*$'                            # bare "Overview" heading
    r'|^Enrollment\s*:'                              # "Enrollment: 60 (HBS/HBS)"
    r'|^Course\s+Format\s*$'                         # "Course Format" heading
    r'|^Grading\b'                                   # "Grading" / "Grading/Course Admin"
    r'|^Requirements?\s*:'                           # "Requirements: …"
    r'|^Sessions?\s*:?\s*\d'                         # "Sessions: 28"
    r'|^(Paper|Exam|Project|Participation|Assignment)\s*$'
    r'|^(Paper|Exam|Project|Participation)(\s+(or|and)\s+(Paper|Exam|Project|Participation))+\s*$'
    r'|^Written\s+(Assignment|Work|Case)\s*$'
    r'|^Take.?Home(\s+Exam)?\s*$'
    r'|^Group\s+Project\s*$'
    r'|^In.?Class\s+Exercises?\s*$'
    r'|^\d+(\.\d+)?%'                               # percentage-only lines
    r'|^Class\s+Participation\s+\d'                 # "Class Participation 50%"
    r'|^(Paper|Exam|Project|Participation)\s+\d{1,3}%',  # "Exam 40%"
    re.I
)

# Section headings that mark the END of the description prose block
DESC_END_RE = re.compile(
    r'^(Educational\s+Objectives?'
    r'|Course\s+Content(?:\s+and\s+Organization)?'
    r'|Grading\s*/\s*Course\s+Administration'
    r'|Course\s+Content\s+Keywords?'
    r'|Career\s+Focus'
    r'|Evaluation\s*:)',
    re.I
)


def clean_description(text):
    """
    Sanitize and trim a raw course description:
      1. Strip leading grading/format noise
      2. Truncate at the first structural section heading
      3. Strip inline section labels (Career Focus:, Overview:, etc.)
      4. Remove Unicode replacement characters and fix smart-quote artifacts
      5. Normalize whitespace
      6. Trim to 800 chars (word boundary)
    """
    if not text:
        return text

    # 1. Strip leading grading/evaluation format noise
    text = re.sub(
        r'^\s*(Exam|Paper|Project|Participation|Assignment)'
        r'(\s+(or|and)\s+(Exam|Paper|Project|Participation|Assignment))*\s+',
        '', text, flags=re.I
    )

    # 2. Cut at the first major structural section heading.
    SECTION_CUT_RE = re.compile(
        r'\b(Educational\s*O?\s*bjectives?'
        r'|Course Content(?:\s+and\s+O?\s*rganization)?'
        r'|Grading\s*/\s*Course Administration'
        r'|Course Content Keywords?'
        r'|Course Format'
        r'|Evaluation\s*:'
        r'|Enrollment\s*:'
        r')\s*[:\s]',
        re.I
    )
    cut = SECTION_CUT_RE.search(text)
    if cut:
        before = text[:cut.start()].strip()
        if len(before) > 60:
            text = before
        else:
            text = text[cut.end():].strip()
            cut2 = SECTION_CUT_RE.search(text)
            if cut2:
                text = text[:cut2.start()].strip()

    # 3. Strip inline section labels that are clearly headings.
    LABEL_RE = re.compile(
        r'\bCareer Focus\s*[:—]?\s*'
        r'|\b(O\s*verview|Course Description|DESCRIPTIO\s*N)\s*[:—]\s*'
        r'|^Purpose\s*[-–—:]\s*(?:[^?]*\?\s*)?'
        r'|\bNote\s*[:—]\s*',
        re.I | re.M
    )
    text = LABEL_RE.sub('', text)

    # 4. Remove encoding artifacts
    text = (text
        .replace('\ufffd', '')
        .replace('\u2019', "'")
        .replace('\u201c', '"')
        .replace('\u201d', '"')
        .replace('\u2013', '–')
        .replace('\u2014', '—')
    )

    # 5. Normalize whitespace
    text = re.sub(r'\s{2,}', ' ', text).strip()

    # 6. Trim to 800 chars at a word boundary
    if len(text) > 800:
        text = text[:800].rsplit(' ', 1)[0] + '…'

    return text


desc_blocks  = list(COURSE_NUM_RE.finditer(desc_text))
descriptions = {}  # course_number → {title, course_number, description}

for i, m in enumerate(desc_blocks):
    course_number = m.group(1)

    if i == 0:
        block_start = 0
    else:
        block_start = desc_blocks[i - 1].end()

    before       = desc_text[block_start:m.start()]
    before_lines = [l.strip() for l in before.split('\n') if l.strip()]

    # Walk backward from the "Course Number" line to extract the course title.
    # Stop as soon as a metadata/prose line is encountered so we don't bleed
    # content from the previous course's description into this title.
    title_lines = []
    for line in reversed(before_lines):
        if re.search(
            r'Copyright|Reserved'
            r'|^\d+\s+credits?'
            r'|^(Fall|Spring|Winter|January)[;\s|,]'
            r'|^\d+\s+[Ss]essions?'
            r'|^\d+[A-Za-z]'                 # run-together: "27Paper", "12sessions"
            r'|^(Paper|Exam|Project|Optional|Participation)[\s/\|]'
            r'|^(Paper|Exam|Project)$'
            r'|^(Paper|Exam|Project|Participation)(\s+(or|and)\s+(Paper|Exam|Project|Participation))+$'
            r'|^(Overview|Career Focus|Educational Objectives?'
            r'|Course Content|Grading|Evaluation|Faculty Assistant'
            r'|Course Description|Note:|Note —)\b'
            r'|^Enrollment\s*:'
            r'|^\d+(\.\d+)?%'               # grade-weight lines
            r'|^Class\s+(Participation|Discussion)'
            r'|^Written?\s+(Assignment|Report|Case)',
            line, re.I
        ):
            break
        if FACULTY_TITLE_RE.match(line):
            break
        # Stop on long prose lines (likely description from previous course)
        if len(line) > 100:
            break
        # Stop on lowercase-start continuation lines (keyword list or prose)
        if title_lines and line and line[0].islower():
            break
        title_lines.insert(0, line)
        # Title is almost always a single line; once we have an uppercase/digit
        # line of reasonable length, stop walking back further.
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

    # Filter description lines.
    # Unlike the previous approach (skip only from the start until non-metadata found),
    # we now filter SCHEDULING_RE and FACULTY_TITLE_RE matches throughout the entire
    # block. This prevents faculty lines, term blocks, and enrollment/session lines
    # that appear mid-block from contaminating the description text.
    content_lines = content_raw.split('\n')
    desc_lines    = []
    header_done   = False

    for line in content_lines:
        stripped = line.strip()
        if not stripped:
            if header_done:
                desc_lines.append('')
            continue

        # Section headings always mark the end of the description prose
        if DESC_END_RE.match(stripped):
            break

        # Filter metadata lines regardless of position in the block
        if SCHEDULING_RE.match(stripped) or FACULTY_TITLE_RE.match(stripped):
            continue

        # In the pre-description header area: also skip bare name-only lines
        # e.g. "Russell J Wilcox" following a faculty title line
        if not header_done and re.match(r'^[A-Z][a-z]+(\s+[A-Z]\.?)+\s+[A-Z][a-z]+$', stripped):
            continue

        header_done = True
        desc_lines.append(stripped)

    description = ' '.join(l for l in desc_lines if l).strip()
    description = re.sub(r'\s+', ' ', description).strip()
    description = clean_description(description)

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
desc_by_num  = {d['course_number']: d for d in descriptions.values()}

matched = 0
for entry in tabular_entries:
    norm = normalize(entry['title'])
    hit  = desc_by_norm.get(norm)

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

# ── Part 5: write courses_data.json ───────────────────────────────────────────

out_path = Path('scripts/courses_data.json')
out_path.write_text(
    json.dumps(tabular_entries, indent=2, ensure_ascii=False),
    encoding='utf-8'
)
print(f'\nWritten {len(tabular_entries)} courses to {out_path}')

# ── Part 6: QA pass — detect and report suspicious rows ──────────────────────
# Writes course_parse_review.json with flagged entries for manual inspection.
# Does not fail the parse — treat this as a post-run audit tool.

_FACULTY_TITLE_WORDS = re.compile(
    r'\b(Professor|Senior Lecturer|Lecturer|Associate Professor|'
    r'Assistant Professor|Adjunct|Visiting Professor)\b',
    re.I
)
_METADATA_FRAGMENT = re.compile(
    r'^(Enrollment:|Exam\b|Paper\b|Grading\b|Course Format\b|Requirements?:)',
    re.I
)

suspicious = []

for entry in tabular_entries:
    issues = []
    title = entry.get('title', '') or ''
    desc  = entry.get('description', '') or ''

    if len(title) > 100:
        issues.append(f'title too long ({len(title)} chars)')
    if _METADATA_FRAGMENT.search(title):
        issues.append('title contains metadata fragment')
    if re.search(r'\d+%', title):
        issues.append('title contains grading percentage')
    if _FACULTY_TITLE_WORDS.search(title):
        issues.append('title contains faculty title keyword')

    if desc:
        if _METADATA_FRAGMENT.match(desc):
            issues.append('description starts with metadata')
        if _FACULTY_TITLE_WORDS.search(desc[:200]):
            issues.append('description contains faculty title near start')
        if re.search(r'\bEnrollment\s*:', desc):
            issues.append('description contains Enrollment: metadata')
        if re.search(r'^\d+\s+sessions?', desc[:80], re.I):
            issues.append('description starts with sessions metadata')

    if issues:
        suspicious.append({
            'title':       title,
            'term':        entry.get('term'),
            'quarter':     entry.get('quarter'),
            'faculty':     entry.get('faculty'),
            'description': desc[:200] if desc else None,
            'issues':      issues,
        })

review_path = Path('scripts/course_parse_review.json')
review_path.write_text(
    json.dumps(suspicious, indent=2, ensure_ascii=False),
    encoding='utf-8'
)

if suspicious:
    print(f'\n⚠  QA flagged {len(suspicious)} suspicious rows → {review_path}')
    for row in suspicious[:5]:
        print(f'  [{", ".join(row["issues"])}]  {row["title"][:70]}')
    if len(suspicious) > 5:
        print(f'  … and {len(suspicious) - 5} more. See {review_path} for full list.')
else:
    print(f'\n✓ QA: no suspicious rows detected')

print('\nFirst 3 entries:')
for e in tabular_entries[:3]:
    print(json.dumps(e, indent=2, ensure_ascii=False))
