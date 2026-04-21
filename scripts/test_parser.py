"""
test_parser.py
==============
Regression fixture tests for the parse-courses.py normalization and
description-filtering logic. Covers failure modes seen in the catalog,
including the John Beshears / Negotiation case (merged faculty-title
tokens, repeated term blocks, metadata-heavy lines, and title bleed).

Run from repo root:
    python scripts/test_parser.py

Exit 0 on success, 1 if any test fails.

Keep these functions in sync with their counterparts in parse-courses.py.
"""

import re
import sys

# ── Functions mirrored from parse-courses.py ──────────────────────────────────

def normalize_raw_text(s):
    """Fix common PDF extraction artifacts."""
    s = s.replace('\u00a0', ' ').replace('\xa0', ' ').replace('\ufeff', '')
    s = re.sub(r'\bO\s+verview\b',       'Overview',      s, flags=re.I)
    s = re.sub(r'\bO\s+bjective',        'Objective',     s, flags=re.I)
    s = re.sub(r'\bO\s+rganization',     'Organization',  s, flags=re.I)
    s = re.sub(r'\bD\s+escription\b',    'Description',   s, flags=re.I)
    s = re.sub(r'\bA\s+dministration\b', 'Administration',s, flags=re.I)
    _TITLE_KW = (r'(?:Professor|Senior\s+Lecturer|Lecturer|'
                 r'Associate\s+Professor|Assistant\s+Professor|Adjunct|Visiting)')
    s = re.sub(r'([a-z])(' + _TITLE_KW + r')', r'\1 \2', s)
    s = re.sub(r'(\d+)\s*([Ss]essions?)\s*([A-Z])', r'\1 \2 \3', s)
    s = re.sub(r'([a-z])(Exam\b|Paper\b)', r'\1 \2', s)
    s = re.sub(r';(\S)', r'; \1', s)
    s = re.sub(r'[ \t]{2,}', ' ', s)
    return s


FACULTY_TITLE_RE = re.compile(
    r'^(?:Professor|Senior Lecturer|Lecturer|Associate Professor|'
    r'Assistant Professor|Adjunct|Visiting|John and Natty|Baker Foundation|'
    r'Professor of Management Practice)\s+',
    re.I
)

SCHEDULING_RE = re.compile(
    r'^(Fall|Spring|Winter|January)[;\s|,]'
    r'|^\d+\s+[Ss]ession'
    r'|^O?\s*verview\s*$'
    r'|^Enrollment\s*:'
    r'|^Course\s+Format\s*$'
    r'|^Grading\b'
    r'|^Requirements?\s*:'
    r'|^Sessions?\s*:?\s*\d'
    r'|^(Paper|Exam|Project|Participation|Assignment)\s*$'
    r'|^(Paper|Exam|Project|Participation)(\s+(or|and)\s+(Paper|Exam|Project|Participation))+\s*$'
    r'|^\d+(\.\d+)?%'
    r'|^(Paper|Exam|Project|Participation)\s+\d{1,3}%',
    re.I
)

DESC_END_RE = re.compile(
    r'^(Educational\s+Objectives?'
    r'|Course\s+Content(?:\s+and\s+Organization)?'
    r'|Grading\s*/\s*Course\s+Administration'
    r'|Course\s+Content\s+Keywords?'
    r'|Career\s+Focus'
    r'|Evaluation\s*:)',
    re.I
)


def filter_desc_lines(content_raw):
    """Filter metadata lines from raw description content (mirrors parse-courses.py logic)."""
    lines = content_raw.split('\n')
    desc_lines = []
    header_done = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if header_done:
                desc_lines.append('')
            continue
        if DESC_END_RE.match(stripped):
            break
        if SCHEDULING_RE.match(stripped) or FACULTY_TITLE_RE.match(stripped):
            continue
        if not header_done and re.match(r'^[A-Z][a-z]+(\s+[A-Z]\.?)+\s+[A-Z][a-z]+$', stripped):
            continue
        header_done = True
        desc_lines.append(stripped)

    return ' '.join(l for l in desc_lines if l).strip()


# ── Tiny test harness ─────────────────────────────────────────────────────────

_pass = 0
_fail = 0


def check(name, got, want_in=None, not_in=None):
    global _pass, _fail
    errors = []
    for exp in ([want_in] if isinstance(want_in, str) else (want_in or [])):
        if exp not in got:
            errors.append(f'  MISSING  {repr(exp)}')
    for bad in ([not_in] if isinstance(not_in, str) else (not_in or [])):
        if bad in got:
            errors.append(f'  PRESENT  {repr(bad)}  (should be absent)')
    if errors:
        _fail += 1
        print(f'FAIL  {name}')
        for e in errors:
            print(e)
        print(f'  got: {repr(got[:300])}')
    else:
        _pass += 1
        print(f'pass  {name}')


# ── normalize_raw_text fixtures ───────────────────────────────────────────────

check('merged token: ZlatevProfessor -> Zlatev Professor',
      normalize_raw_text('ZlatevProfessor of Finance'),
      want_in='Zlatev Professor')

check('merged token: lowercase+Senior Lecturer',
      normalize_raw_text('John smithSenior Lecturer'),
      want_in='smith Senior Lecturer')

check('merged token: Assistant Professor',
      normalize_raw_text('BeshearsAssistant Professor'),
      want_in='Beshears Assistant Professor')

check('split heading: O verview -> Overview',
      normalize_raw_text('O verview'),
      want_in='Overview', not_in='O verview')

check('split heading: O bjectives -> Objectives',
      normalize_raw_text('O bjectives'),
      want_in='Objectives')

check('split heading: O rganization',
      normalize_raw_text('Course Content and O rganization'),
      want_in='Organization')

check('merged session/exam: 28sessionsExam',
      normalize_raw_text('28sessionsExam'),
      want_in='28 sessions Exam')

check('merged exam token: mid-word',
      normalize_raw_text('finalExam'),
      want_in='final Exam')

check('semicolon spacing: Fall;Q1Q2 -> Fall; Q1Q2',
      normalize_raw_text('Fall;Q1Q2'),
      want_in='Fall; Q1Q2')

check('non-breaking space normalized',
      normalize_raw_text('hello\u00a0world'),
      want_in='hello world', not_in='\u00a0')

# ── filter_desc_lines fixtures ────────────────────────────────────────────────

check('faculty title line at description start is filtered',
      filter_desc_lines('Assistant Professor John Beshears\nThis course covers negotiation.'),
      want_in='This course covers negotiation', not_in='Assistant Professor')

check('faculty title line mid-description is filtered',
      filter_desc_lines(
          'This course covers negotiation.\n'
          'Assistant Professor John Beshears\n'
          'More text here.'
      ),
      want_in='This course covers negotiation',
      not_in='Assistant Professor John Beshears')

check('Enrollment line filtered',
      filter_desc_lines('This course examines markets.\nEnrollment: 60\nStudents will learn.'),
      want_in='This course examines markets', not_in='Enrollment:')

check('session count line filtered',
      filter_desc_lines('28 sessions\nThis course covers case analysis.'),
      want_in='This course covers case analysis', not_in='28 sessions')

check('standalone Exam line filtered',
      filter_desc_lines('Exam\nThis course develops analytical skills.'),
      want_in='This course develops analytical skills', not_in='Exam')

check('standalone Paper line filtered',
      filter_desc_lines('Paper\nThis course develops analytical skills.'),
      want_in='This course develops analytical skills', not_in='Paper')

check('term line filtered',
      filter_desc_lines('Fall; Q1Q2; 3.0 credits\nThis course examines strategy.'),
      want_in='This course examines strategy', not_in='Fall; Q1Q2')

check('Grading line filtered',
      filter_desc_lines('This is the overview.\nGrading/Course Administration\nExam 50%.'),
      want_in='This is the overview', not_in='Grading')

check('Educational Objectives heading ends description collection',
      filter_desc_lines('This course covers negotiation.\nEducational Objectives\nMore stuff.'),
      want_in='This course covers negotiation', not_in='Educational Objectives')

check('Career Focus heading ends description collection',
      filter_desc_lines('Real overview text.\nCareer Focus\nThis course is designed for.'),
      want_in='Real overview text', not_in='Career Focus')

# John Beshears / Negotiation failure mode: full composite fixture
check('Beshears composite: all metadata filtered, prose preserved',
      filter_desc_lines(
          'Assistant Professor John Beshears\n'
          'Fall; Q1Q2; 3.0 credits\n'
          '28 sessions\n'
          'Exam\n'
          'Enrollment: 84\n'
          'This course investigates the psychology of negotiation.'
      ),
      want_in='This course investigates the psychology of negotiation',
      not_in=['Assistant Professor', 'Enrollment:', '28 sessions', 'Exam'])

check('repeated term block inside description is filtered',
      filter_desc_lines(
          'This is the real overview text.\n'
          'Spring; Q3Q4; 3.0 credits\n'
          '28 sessions\n'
          'Paper\n'
          'Enrollment: 40'
      ),
      want_in='This is the real overview text',
      not_in=['Spring; Q3Q4', '28 sessions', 'Enrollment:'])

check('title bleed: prior-course prose line (>100 chars) does not reach description',
      filter_desc_lines(
          'This is a very long sentence from the previous course description that exceeds '
          'one hundred characters and should be treated as prose not a title.\n'
          'Real Course Title\n'
          'This course covers strategy.'
      ),
      want_in='This course covers strategy')

# ── SCHEDULING_RE spot-checks ─────────────────────────────────────────────────

def sched(line):
    return 'YES' if SCHEDULING_RE.match(line) else 'NO'

check('SCHEDULING_RE matches Enrollment line',  sched('Enrollment: 60 (HBS/HBS)'), want_in='YES')
check('SCHEDULING_RE matches Grading line',     sched('Grading/Course Administration'), want_in='YES')
check('SCHEDULING_RE matches standalone Paper', sched('Paper'), want_in='YES')
check('SCHEDULING_RE matches "Paper or Exam"',  sched('Paper or Exam'), want_in='YES')
check('SCHEDULING_RE matches percentage line',  sched('50%'), want_in='YES')
check('SCHEDULING_RE does NOT match real prose',
      sched('This paper explores the dynamics of negotiation'),
      want_in='NO')
check('SCHEDULING_RE does NOT match "Paper" mid-sentence (no ^ anchor issue)',
      sched('The paper requires weekly readings'),
      want_in='NO')

# ── FACULTY_TITLE_RE spot-checks ──────────────────────────────────────────────

def fac(line):
    return 'YES' if FACULTY_TITLE_RE.match(line) else 'NO'

check('FACULTY_TITLE_RE matches Professor',          fac('Professor John Smith'), want_in='YES')
check('FACULTY_TITLE_RE matches Assistant Professor',fac('Assistant Professor Jane Doe'), want_in='YES')
check('FACULTY_TITLE_RE matches Senior Lecturer',    fac('Senior Lecturer Robert Jones'), want_in='YES')
check('FACULTY_TITLE_RE matches Associate Professor',fac('Associate Professor Mary Lee'), want_in='YES')
check('FACULTY_TITLE_RE does NOT match non-faculty', fac('This is a description line'), want_in='NO')

# ── Summary ───────────────────────────────────────────────────────────────────

total = _pass + _fail
print(f'\n{total} tests: {_pass} passed, {_fail} failed')
sys.exit(0 if _fail == 0 else 1)
