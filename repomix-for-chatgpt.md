This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

- Pay special attention to the Repository Instruction. These contain important context and guidelines specific to this project.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: repomix-output.txt, scripts/courses_raw.json, scripts/courses_data.json, scripts/enriched_faculty.json, scripts/all_faculty.json, CRITIQUE_BRIEF.txt, scripts/courses_raw.txt, scripts/tags-master.json, scripts/courses.json, repomix-output.txt, repomix-for-chatgpt.md, repomix-instructions.md, audit-results.json, rescrape-report.json, CRITIQUE_BRIEF.txt, NEXT_SESSION_FACULTY_DATA.md, backups/**, dist/**, scripts/**, public/**, *.lock, src/assets/**, supabase/migrations/006_seed_faculty_pilot.sql, supabase/migrations/020_faculty_emails_batch3.sql, supabase/migrations/021_faculty_emails_batch4.sql, supabase/migrations/019_faculty_emails*.sql, supabase/migrations/022_faculty_research_tags*.sql
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.gitignore
CLAUDE.md
eslint.config.js
index.html
package.json
README.md
repomix.config.json
src/components/Footer.jsx
src/components/Icons.jsx
src/components/Layout.jsx
src/components/NavBar.jsx
src/components/ProFoundLogo.jsx
src/index.css
src/lib/analytics.js
src/lib/constants.js
src/lib/edgeFunction.js
src/lib/hooks.js
src/lib/pdf.js
src/lib/supabase.js
src/lib/utils.js
src/main.jsx
src/pages/AdminFeedback.jsx
src/pages/AuthCallback.jsx
src/pages/CaseStudyIdeas.jsx
src/pages/CourseDirectory.jsx
src/pages/CourseMatch.jsx
src/pages/Dashboard.jsx
src/pages/Faculty.jsx
src/pages/FacultyDetail.jsx
src/pages/Landing.jsx
src/pages/Matching.jsx
src/pages/ProfileDetail.jsx
src/pages/ProfileEdit.jsx
src/pages/ProfileNew.jsx
src/pages/SavedIdeas.jsx
supabase/functions/_shared/mod.ts
supabase/functions/generate-case-ideas/index.ts
supabase/functions/generate-course-matches/index.ts
supabase/functions/generate-email-draft/index.ts
supabase/functions/generate-matches/index.ts
supabase/migrations/001_create_hbs_ip.sql
supabase/migrations/002_create_student_files_bucket.sql
supabase/migrations/003_add_program_and_faculty_fields.sql
supabase/migrations/004_add_website_and_background_fields.sql
supabase/migrations/005_create_faculty.sql
supabase/migrations/007_faculty_enrichment_schema.sql
supabase/migrations/008_seed_faculty_tags.sql
supabase/migrations/009_cleanup_scraped_tags.sql
supabase/migrations/010_faculty_courses_schema.sql
supabase/migrations/011_research_tags_function.sql
supabase/migrations/012_saved_faculty.sql
supabase/migrations/013_matching.sql
supabase/migrations/014_profile_pdf_text.sql
supabase/migrations/015_case_idea_runs.sql
supabase/migrations/016_saved_case_ideas_and_unmatch.sql
supabase/migrations/017_feedback.sql
supabase/migrations/018_email_draft_runs.sql
supabase/migrations/019_correct_faculty_emails.sql
supabase/migrations/021_feedback_admin_and_screenshots.sql
supabase/migrations/022_course_catalog_schema.sql
supabase/migrations/023_course_match_strength.sql
supabase/migrations/023_deduplicate_faculty_courses.sql
supabase/migrations/024_course_dedupe_term_aware.sql
supabase/migrations/025_profile_topics_to_explore.sql
supabase/migrations/026_saved_faculty_status.sql
supabase/migrations/027_product_events.sql
supabase/migrations/028_saved_faculty_update_policy.sql
vite.config.js
```

# Files

## File: eslint.config.js
````javascript

````

## File: repomix.config.json
````json
{
  "output": {
    "filePath": "repomix-output.txt",
    "style": "plain",
    "showLineNumbers": false,
    "copyToClipboard": false
  },
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": [
      "repomix-output.txt",
      "scripts/courses_raw.json",
      "scripts/courses_data.json",
      "scripts/enriched_faculty.json",
      "scripts/all_faculty.json",
      "CRITIQUE_BRIEF.txt",
      "scripts/courses_raw.txt",
      "scripts/tags-master.json",
      "scripts/courses.json"
    ]
  }
}
````

## File: src/components/Layout.jsx
````javascript
/**
 * Authenticated page layout wrapper.
 * Appends the feedback-enabled copyright footer after each post-login page.
 * NavBar is handled inside each page component.
 */
export default function Layout(
````

## File: src/lib/analytics.js
````javascript
/**
 * Fire-and-forget product event. Never throws — failures are logged silently.
 * Call without await at event sites.
 */
export function trackEvent(eventName, properties =
````

## File: src/lib/pdf.js
````javascript
// Vite resolves this URL to the bundled worker asset at build time
⋮----
/**
 * Extracts plain text from a PDF File object.
 * Returns up to 15,000 characters (~5–6 pages), which is enough signal
 * for the matching algorithm without bloating the Claude context window.
 *
 * @param {File} file - A PDF File from an <input type="file"> element
 * @returns {Promise<string>} Extracted text, capped at 15k chars
 */
export async function extractPdfText(file)
````

## File: src/lib/supabase.js
````javascript

````

## File: src/pages/AdminFeedback.jsx
````javascript
function formatDate(ts)
⋮----
export default function AdminFeedback()
⋮----
const [lightbox, setLightbox]   = useState(null)  // signed URL string | null
⋮----
// Redirect non-admins once the check resolves
⋮----
// Fetch feedback once confirmed admin
⋮----
async function openScreenshot(storagePath)
⋮----
.createSignedUrl(storagePath, 60 * 60) // 1-hour expiry
⋮----
// Still checking auth
⋮----
{/* Header */}
⋮----
{/* Content */}
⋮----
{/* Lightbox */}
⋮----
// ── Single feedback card ───────────────────────────────────────────────────────
⋮----
function FeedbackCard(
⋮----
{/* Meta row */}
⋮----
{/* Message */}
⋮----
{/* Screenshot thumbnail */}
````

## File: src/pages/AuthCallback.jsx
````javascript
export default function AuthCallback()
````

## File: supabase/migrations/001_create_hbs_ip.sql
````sql
-- ============================================================
-- 001_create_hbs_ip.sql
-- Student profile table for the HBS IP / case-writing matcher
-- ============================================================

-- Trigger function to keep updated_at current
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table hbs_ip (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users on delete cascade,

  -- Identity
  first_name       text        not null,
  last_name        text        not null,
  email            text        not null unique
                               check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- HBS program details
  graduation_year  integer     not null
                               check (
                                 graduation_year >= 2026
                                 and graduation_year <= extract(year from now())::int + 10
                               ),
  hbs_section      text        check (hbs_section in ('A','B','C','D','E','F','G','H','I','J')),

  -- Uploaded files (Supabase Storage object paths)
  resume_path      text,       -- e.g. resumes/<user_id>/resume.pdf
  linkedin_pdf_path text,      -- e.g. linkedin/<user_id>/profile.pdf

  -- Research & interest profile
  professional_interests text, -- free-text description of interests / goals
  linkedin_url     text,       -- public LinkedIn profile URL

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One profile per user
create unique index hbs_ip_user_id_idx on hbs_ip (user_id);

-- Auto-update updated_at
create trigger hbs_ip_set_updated_at
  before update on hbs_ip
  for each row execute function set_updated_at();

-- ── Row Level Security ─────────────────────────────────────

alter table hbs_ip enable row level security;

create policy "Users can view their own profile"
  on hbs_ip for select
  using (user_id = auth.uid());

create policy "Users can insert their own profile"
  on hbs_ip for insert
  with check (user_id = auth.uid());

create policy "Users can update their own profile"
  on hbs_ip for update
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own profile"
  on hbs_ip for delete
  using (user_id = auth.uid());
````

## File: supabase/migrations/002_create_student_files_bucket.sql
````sql
-- ============================================================
-- 002_create_student_files_bucket.sql
-- Supabase Storage bucket for student resume and LinkedIn PDF uploads
-- Files are stored at {user_id}/resume.pdf and {user_id}/linkedin.pdf
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', false)
on conflict do nothing;

-- Users can upload files under their own user_id prefix
create policy "Users can upload their own files"
  on storage.objects for insert
  with check (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can read their own files
create policy "Users can read their own files"
  on storage.objects for select
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can overwrite/update their own files
create policy "Users can update their own files"
  on storage.objects for update
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can delete their own files
create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );
````

## File: supabase/migrations/003_add_program_and_faculty_fields.sql
````sql
-- ============================================================
-- 003_add_program_and_faculty_fields.sql
-- Adds program enrollment and faculty-in-mind fields to hbs_ip
-- ============================================================

alter table hbs_ip
  add column program       text check (program in ('MBA', 'Executive Education', 'Other')),
  add column program_other text,   -- free-text description when program = 'Other'
  add column faculty_in_mind text; -- optional list of faculty the student already has in mind
````

## File: supabase/migrations/004_add_website_and_background_fields.sql
````sql
-- ============================================================
-- 004_add_website_and_background_fields.sql
-- ============================================================

alter table hbs_ip
  add column website_urls          text, -- personal websites / portfolios (newline-separated)
  add column additional_background text; -- background not captured on resume or LinkedIn
````

## File: supabase/migrations/005_create_faculty.sql
````sql
-- Faculty directory table
create table if not exists faculty (
  id            uuid        default gen_random_uuid() primary key,
  hbs_fac_id    text        unique not null,           -- facId from HBS profile URL
  name          text        not null,
  title         text,                                  -- named professorship / rank
  unit          text,                                  -- HBS academic unit
  email         text,
  bio           text,
  profile_url   text,
  image_url     text,
  created_at    timestamptz default now()
);

-- Full-text search index over name, unit, and bio
create index faculty_name_idx on faculty using gin(to_tsvector('english', name));
create index faculty_bio_idx  on faculty using gin(to_tsvector('english', coalesce(bio, '')));
create index faculty_unit_idx on faculty (unit);

-- RLS: authenticated users can browse the faculty directory (read-only)
alter table faculty enable row level security;

create policy "Authenticated users can read faculty"
  on faculty for select
  to authenticated
  using (true);
````

## File: supabase/migrations/007_faculty_enrichment_schema.sql
````sql
-- Research keyword tags scraped from HBS faculty profile pages
create table if not exists faculty_tags (
  id          uuid        default gen_random_uuid() primary key,
  faculty_id  uuid        not null references faculty(id) on delete cascade,
  tag         text        not null,
  source      text        default 'hbs',
  created_at  timestamptz default now(),
  unique (faculty_id, tag)
);

alter table faculty_tags enable row level security;

create policy "Authenticated users can read faculty_tags"
  on faculty_tags for select
  to authenticated
  using (true);

create index faculty_tags_faculty_id_idx on faculty_tags (faculty_id);


-- Recent publications scraped from HBS faculty profile pages
create table if not exists faculty_publications (
  id          uuid        default gen_random_uuid() primary key,
  faculty_id  uuid        not null references faculty(id) on delete cascade,
  title       text        not null,
  year        integer,
  pub_type    text,       -- 'Journal Article' | 'Book' | 'Case' | 'Working Paper' | 'Chapter'
  journal     text,       -- journal or publisher name
  url         text,       -- link to HBS item page or external DOI
  source      text        default 'hbs',
  created_at  timestamptz default now()
);

alter table faculty_publications enable row level security;

create policy "Authenticated users can read faculty_publications"
  on faculty_publications for select
  to authenticated
  using (true);

create index faculty_publications_faculty_id_idx on faculty_publications (faculty_id);
create index faculty_publications_year_idx       on faculty_publications (year desc);
````

## File: supabase/migrations/008_seed_faculty_tags.sql
````sql
-- Curated research tags for the 20 pilot faculty
-- Inserted via faculty_id looked up from hbs_fac_id.
-- Tags reflect each professor's primary research areas.

insert into faculty_tags (faculty_id, tag, source)
select f.id, v.tag, 'manual'
from faculty f
join (values
  -- Jung Koo Kang (A&M)
  ('1324810', 'Financial Accounting'),
  ('1324810', 'Banking'),
  ('1324810', 'Fintech'),
  ('1324810', 'Digital Lending'),
  ('1324810', 'Information Economics'),

  -- Jonas Heese (A&M)
  ('740159', 'Accounting'),
  ('740159', 'Corporate Governance'),
  ('740159', 'Financial Reporting'),
  ('740159', 'Regulatory Compliance'),
  ('740159', 'Auditing'),

  -- Jesse M. Shapiro (BGIE)
  ('1356397', 'Political Economy'),
  ('1356397', 'Media & Democracy'),
  ('1356397', 'Polarization'),
  ('1356397', 'Public Economics'),
  ('1356397', 'Electoral Politics'),

  -- Caroline M. Elkins (BGIE)
  ('937841', 'British Empire'),
  ('937841', 'Colonialism'),
  ('937841', 'African History'),
  ('937841', 'Human Rights'),
  ('937841', 'Violence & Conflict'),

  -- Paul A. Gompers (Finance)
  ('6463', 'Private Equity'),
  ('6463', 'Venture Capital'),
  ('6463', 'Entrepreneurial Finance'),
  ('6463', 'Corporate Governance'),
  ('6463', 'Innovation'),

  -- Tom Nicholas (Entrepreneurial Management)
  ('337264', 'Venture Capital History'),
  ('337264', 'Innovation'),
  ('337264', 'Entrepreneurship'),
  ('337264', 'Economic History'),
  ('337264', 'Intellectual Property'),

  -- Malcolm Baker (Finance)
  ('10639', 'Behavioral Finance'),
  ('10639', 'Corporate Finance'),
  ('10639', 'Asset Pricing'),
  ('10639', 'Capital Markets'),
  ('10639', 'Investor Behavior'),

  -- John D. Macomber (Finance)
  ('92011', 'Real Estate'),
  ('92011', 'Infrastructure'),
  ('92011', 'Emerging Markets'),
  ('92011', 'Sustainability'),
  ('92011', 'Urban Development'),

  -- Anita Elberse (Marketing)
  ('244024', 'Entertainment Industry'),
  ('244024', 'Sports Business'),
  ('244024', 'Media Strategy'),
  ('244024', 'Blockbuster Strategy'),
  ('244024', 'Celebrity & Talent'),

  -- Sunil Gupta (Marketing)
  ('261323', 'Digital Marketing'),
  ('261323', 'Customer Management'),
  ('261323', 'Platform Strategy'),
  ('261323', 'Business Models'),
  ('261323', 'Data-Driven Marketing'),

  -- Alex Chan (Marketing)
  ('1495303', 'Consumer Behavior'),
  ('1495303', 'Marketing Strategy'),
  ('1495303', 'Behavioral Economics'),
  ('1495303', 'Decision Making'),

  -- Michael I. Norton (Marketing)
  ('326229', 'Behavioral Economics'),
  ('326229', 'Consumer Psychology'),
  ('326229', 'Happiness & Well-being'),
  ('326229', 'Fairness'),
  ('326229', 'Rituals & Behavior'),

  -- Linda A. Hill (OB)
  ('6479', 'Leadership Development'),
  ('6479', 'Management'),
  ('6479', 'Organizational Change'),
  ('6479', 'Innovation Culture'),
  ('6479', 'Talent Management'),

  -- Boris Groysberg (OB)
  ('10650', 'Talent Management'),
  ('10650', 'Leadership'),
  ('10650', 'Human Capital'),
  ('10650', 'Executive Mobility'),
  ('10650', 'Organizational Behavior'),

  -- Ramon Casadesus-Masanell (Strategy)
  ('24279', 'Business Models'),
  ('24279', 'Competitive Strategy'),
  ('24279', 'Platform Competition'),
  ('24279', 'Open Source'),
  ('24279', 'Value Creation'),

  -- Andy Wu (Strategy)
  ('871877', 'Technology Strategy'),
  ('871877', 'Entrepreneurship'),
  ('871877', 'Platform Economics'),
  ('871877', 'Competitive Dynamics'),
  ('871877', 'Digital Strategy'),

  -- Marco Iansiti (TOM)
  ('6482', 'Digital Transformation'),
  ('6482', 'Artificial Intelligence'),
  ('6482', 'Technology Strategy'),
  ('6482', 'Operations'),
  ('6482', 'Ecosystem Strategy'),

  -- Amy C. Edmondson (OB)
  ('6451', 'Psychological Safety'),
  ('6451', 'Teaming'),
  ('6451', 'Organizational Learning'),
  ('6451', 'Leadership'),
  ('6451', 'Healthcare Management'),

  -- Karim R. Lakhani (TOM)
  ('240491', 'Open Innovation'),
  ('240491', 'Crowdsourcing'),
  ('240491', 'Artificial Intelligence'),
  ('240491', 'Digital Transformation'),
  ('240491', 'Platforms'),

  -- Feng Zhu (TOM)
  ('14938', 'Platform Strategy'),
  ('14938', 'Digital Markets'),
  ('14938', 'Technology Competition'),
  ('14938', 'Two-Sided Markets'),
  ('14938', 'Ecosystem Management')

) as v(hbs_fac_id, tag) on f.hbs_fac_id = v.hbs_fac_id
on conflict (faculty_id, tag) do nothing;
````

## File: supabase/migrations/009_cleanup_scraped_tags.sql
````sql
-- Remove low-quality tags inserted by the initial scraper run.
-- These were nav links / sidebar text, not actual research areas.
delete from faculty_tags
where source = 'hbs'
  and tag in (
    'accounting red flags',
    'MBA Alumni Research Survey Information',
    'entrepreneurship'
  );
````

## File: supabase/migrations/010_faculty_courses_schema.sql
````sql
-- ============================================================
-- 010_faculty_courses_schema.sql
-- Courses taught by HBS faculty, sourced from the course catalog
-- ============================================================

create table faculty_courses (
  id           uuid        primary key default gen_random_uuid(),
  faculty_id   uuid        not null references faculty(id) on delete cascade,
  course_title text        not null,
  description  text,
  unit         text,
  term         text,        -- e.g. "Fall 2026", "Spring 2027"
  quarter      text,        -- e.g. "Q1", "Q1Q2", "Q3Q4"
  credits      numeric(3,1),
  source       text        not null default 'hbs_catalog',
  created_at   timestamptz not null default now()
);

create index faculty_courses_faculty_id_idx on faculty_courses (faculty_id);

-- ── Row Level Security ─────────────────────────────────────

alter table faculty_courses enable row level security;

create policy "Authenticated users can read faculty courses"
  on faculty_courses for select
  to authenticated
  using (true);
````

## File: supabase/migrations/011_research_tags_function.sql
````sql
-- ── Research tags filter function ────────────────────────────────────────────
--
-- Returns every tag in use, sorted by how many faculty carry it.
-- Called by the Faculty browse page to populate the Topic filter pills and
-- by any future filtering UI that needs the canonical tag list.
--
-- Usage (from the app):
--   const { data } = await supabase.rpc('get_research_tags')
--   // → [{ tag: 'Corporate Governance', faculty_count: 28 }, ...]
--
-- Usage (SQL):
--   SELECT * FROM get_research_tags() WHERE faculty_count >= 3;

create or replace function get_research_tags()
returns table(tag text, faculty_count bigint)
language sql
security definer
stable
as $$
  select
    ft.tag,
    count(distinct ft.faculty_id) as faculty_count
  from faculty_tags ft
  group by ft.tag
  order by faculty_count desc, ft.tag
$$;

-- Grant read access to authenticated users (matches RLS on faculty_tags)
grant execute on function get_research_tags() to authenticated;


-- ── Faculty search by tag ─────────────────────────────────────────────────────
--
-- Returns all faculty IDs that carry a given tag.
-- Useful for server-side filtering if the client-side approach becomes too slow.
--
-- Usage (from the app):
--   const { data } = await supabase.rpc('get_faculty_by_tag', { tag_name: 'ESG Investing' })
--   // → [{ faculty_id: '...' }, ...]

create or replace function get_faculty_by_tag(tag_name text)
returns table(faculty_id uuid)
language sql
security definer
stable
as $$
  select distinct ft.faculty_id
  from faculty_tags ft
  where lower(ft.tag) = lower(tag_name)
$$;

grant execute on function get_faculty_by_tag(text) to authenticated;
````

## File: supabase/migrations/012_saved_faculty.sql
````sql
-- ── Saved faculty bookmarks ───────────────────────────────────────────────────
-- Users can bookmark faculty profiles to their Dashboard.
-- One row per (user, faculty) pair; enforced unique at DB level.

create table saved_faculty (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  faculty_id  uuid        not null references faculty(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_id, faculty_id)
);

alter table saved_faculty enable row level security;

create policy "Users can read their own saved faculty"
  on saved_faculty for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can save faculty"
  on saved_faculty for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unsave faculty"
  on saved_faculty for delete
  to authenticated
  using (auth.uid() = user_id);

create index saved_faculty_user_id_idx   on saved_faculty (user_id);
create index saved_faculty_faculty_id_idx on saved_faculty (faculty_id);
````

## File: supabase/migrations/013_matching.sql
````sql
-- ── Faculty Matching ──────────────────────────────────────────────────────────
-- match_runs: one row per AI matching run per user
-- faculty_matches: 2–10 ranked matches within each run

create table match_runs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table match_runs enable row level security;

create policy "Users can read own runs"
  on match_runs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own runs"
  on match_runs for insert
  to authenticated
  with check (auth.uid() = user_id);

create index match_runs_user_id_idx on match_runs (user_id);


create table faculty_matches (
  id                  uuid    default gen_random_uuid() primary key,
  run_id              uuid    not null references match_runs(id) on delete cascade,
  faculty_id          uuid    not null references faculty(id) on delete cascade,
  rank                integer not null,
  match_strength      text    check (match_strength in ('strong', 'good', 'exploratory')),
  match_reasons       text[]  not null default '{}',
  collaboration_ideas text[]  not null default '{}',
  created_at          timestamptz default now()
);

alter table faculty_matches enable row level security;

-- Users can read their own matches by joining through match_runs
create policy "Users can read own matches"
  on faculty_matches for select
  to authenticated
  using (
    exists (
      select 1 from match_runs mr
      where mr.id = run_id
        and mr.user_id = auth.uid()
    )
  );

create index faculty_matches_run_id_idx     on faculty_matches (run_id);
create index faculty_matches_faculty_id_idx on faculty_matches (faculty_id);
````

## File: supabase/migrations/014_profile_pdf_text.sql
````sql
-- ── PDF text extraction columns ───────────────────────────────────────────────
-- Stores client-side-extracted text from uploaded resume and LinkedIn PDFs.
-- Populated by the profile form when a user uploads a PDF.
-- Used by the generate-matches Edge Function as input to the matching algorithm.

alter table hbs_ip
  add column if not exists resume_text   text,
  add column if not exists linkedin_text text;
````

## File: supabase/migrations/015_case_idea_runs.sql
````sql
-- 015_case_idea_runs.sql
-- Lightweight event-log table for case study idea generation runs.
-- Used for rate limiting (3 per user per day) since generated ideas are ephemeral.

create table case_idea_runs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  match_id   uuid        not null references faculty_matches(id) on delete cascade,
  created_at timestamptz default now()
);

alter table case_idea_runs enable row level security;

create policy "Users can read own case idea runs"
  on case_idea_runs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own case idea runs"
  on case_idea_runs for insert to authenticated
  with check (auth.uid() = user_id);

create index case_idea_runs_user_id_idx on case_idea_runs (user_id);
````

## File: supabase/migrations/016_saved_case_ideas_and_unmatch.sql
````sql
-- Part A: allow users to hard-delete their own faculty_matches rows
create policy "Users can delete own matches"
  on faculty_matches for delete to authenticated
  using (exists (
    select 1 from match_runs mr
    where mr.id = run_id and mr.user_id = auth.uid()
  ));

-- Part B: persisted saved case study ideas
-- No unique constraint: users may save near-identical ideas from different generation runs
create table saved_case_ideas (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  match_id         uuid        not null references faculty_matches(id) on delete cascade,
  faculty_id       uuid        not null references faculty(id) on delete cascade,
  title            text        not null,
  premise          text,
  protagonist      text,
  teaching_themes  text[]      not null default '{}',
  student_angle    text,
  faculty_angle    text,
  created_at       timestamptz default now()
);

alter table saved_case_ideas enable row level security;
create policy "Users can read own saved ideas"   on saved_case_ideas for select to authenticated using (auth.uid() = user_id);
create policy "Users can save ideas"             on saved_case_ideas for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own saved ideas" on saved_case_ideas for delete to authenticated using (auth.uid() = user_id);

create index saved_case_ideas_user_id_idx    on saved_case_ideas (user_id);
create index saved_case_ideas_match_id_idx   on saved_case_ideas (match_id);
create index saved_case_ideas_faculty_id_idx on saved_case_ideas (faculty_id);
````

## File: supabase/migrations/017_feedback.sql
````sql
create table feedback (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete set null,
  message    text        not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

-- Authenticated users can submit feedback
create policy "Users can insert feedback"
  on feedback for insert to authenticated
  with check (auth.uid() = user_id);

-- No select policy for regular users — only service role (admin) can read
create index feedback_created_at_idx on feedback (created_at desc);
````

## File: supabase/migrations/018_email_draft_runs.sql
````sql
create table email_draft_runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  faculty_id uuid not null references faculty(id) on delete cascade,
  created_at timestamptz default now()
);
alter table email_draft_runs enable row level security;
create policy "Users can read own email draft runs" on email_draft_runs
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own email draft runs" on email_draft_runs
  for insert to authenticated with check (auth.uid() = user_id);
create index email_draft_runs_user_id_idx on email_draft_runs (user_id);
````

## File: supabase/migrations/019_correct_faculty_emails.sql
````sql
-- Correct all faculty email addresses to standard HBS format:
-- [first initial][last name]@hbs.edu  (e.g. Louis Caldera → lcaldera@hbs.edu)
-- Previous seed used a non-standard firstname_lastname format.

update faculty set email = 'jkang@hbs.edu'              where name = 'Jung Koo Kang';
update faculty set email = 'jheese@hbs.edu'             where name = 'Jonas Heese';
update faculty set email = 'jshapiro@hbs.edu'           where name = 'Jesse M. Shapiro';
update faculty set email = 'celkins@hbs.edu'            where name = 'Caroline M. Elkins';
update faculty set email = 'pgompers@hbs.edu'           where name = 'Paul A. Gompers';
update faculty set email = 'tnicholas@hbs.edu'          where name = 'Tom Nicholas';
update faculty set email = 'mbaker@hbs.edu'             where name = 'Malcolm Baker';
update faculty set email = 'jmacomber@hbs.edu'          where name = 'John D. Macomber';
update faculty set email = 'aelberse@hbs.edu'           where name = 'Anita Elberse';
update faculty set email = 'sgupta@hbs.edu'             where name = 'Sunil Gupta';
update faculty set email = 'achan@hbs.edu'              where name = 'Alex Chan';
update faculty set email = 'mnorton@hbs.edu'            where name = 'Michael I. Norton';
update faculty set email = 'lhill@hbs.edu'              where name = 'Linda A. Hill';
update faculty set email = 'bgroysberg@hbs.edu'         where name = 'Boris Groysberg';
update faculty set email = 'rmasanell@hbs.edu'          where name = 'Ramon Casadesus-Masanell';
update faculty set email = 'awu@hbs.edu'                where name = 'Andy Wu';
update faculty set email = 'miansiti@hbs.edu'           where name = 'Marco Iansiti';
update faculty set email = 'aedmondson@hbs.edu'         where name = 'Amy C. Edmondson';
update faculty set email = 'klakhani@hbs.edu'           where name = 'Karim R. Lakhani';
update faculty set email = 'fzhu@hbs.edu'               where name = 'Feng Zhu';
````

## File: supabase/migrations/021_feedback_admin_and_screenshots.sql
````sql
-- Add screenshot_url and user_email columns to feedback
alter table feedback add column screenshot_url text;
alter table feedback add column user_email text;

-- ── Admins table ───────────────────────────────────────────────────────────────
create table admins (
  user_id uuid references auth.users(id) on delete cascade primary key
);

alter table admins enable row level security;

-- Any authenticated user can check whether they are in the admins table
create policy "Authenticated users can read admins"
  on admins for select to authenticated using (true);

-- ── Feedback read/update policies for admins ───────────────────────────────────
create policy "Admins can select feedback"
  on feedback for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "Admins can update feedback"
  on feedback for update to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

-- ── Storage bucket for screenshots ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict do nothing;

-- Authenticated users can upload screenshots into their own folder
create policy "Users can upload feedback screenshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all screenshots (to generate signed URLs)
create policy "Admins can read feedback screenshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and exists (select 1 from admins where user_id = auth.uid())
  );
````

## File: supabase/migrations/022_course_catalog_schema.sql
````sql
-- ============================================================
-- 022_course_catalog_schema.sql
-- Extends faculty_courses for the full course catalog,
-- adds saved_courses and course_match_runs tables.
-- ============================================================

-- Allow catalog courses that have external/unknown faculty
-- (faculty_id was NOT NULL in migration 010 — drop the constraint)
alter table faculty_courses alter column faculty_id drop not null;

-- Store raw faculty name from catalog (always populated)
alter table faculty_courses add column if not exists faculty_name text;

-- Store catalog course number (e.g. "1830", "2126")
alter table faculty_courses add column if not exists course_number text;

-- ── Saved courses (mirrors saved_faculty) ─────────────────────────────────────

create table saved_courses (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade,
  course_id  uuid        references faculty_courses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

alter table saved_courses enable row level security;

create policy "Users can manage own saved courses"
  on saved_courses for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Course match rate-limiting (mirrors match_runs) ───────────────────────────

create table course_match_runs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table course_match_runs enable row level security;

create policy "Users manage own course match runs"
  on course_match_runs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index course_match_runs_user_created_idx
  on course_match_runs (user_id, created_at desc);

-- ── Persisted course match results (mirrors faculty_matches) ──────────────────

create table course_matches (
  id         uuid        default gen_random_uuid() primary key,
  run_id     uuid        references course_match_runs(id) on delete cascade,
  course_id  uuid        references faculty_courses(id) on delete cascade,
  rank       integer     not null,
  rationale  text[]      not null default '{}',
  created_at timestamptz default now()
);

alter table course_matches enable row level security;

-- Users can read their own match results (run_id links back to their run)
create policy "Users can read own course matches"
  on course_matches for select to authenticated
  using (
    exists (
      select 1 from course_match_runs
      where id = course_matches.run_id
        and user_id = auth.uid()
    )
  );
````

## File: supabase/migrations/023_course_match_strength.sql
````sql
-- Add match_strength to course_matches (mirrors faculty_matches pattern)
alter table course_matches
  add column if not exists match_strength text
  check (match_strength in ('strong', 'good', 'exploratory'));

-- Allow users to delete their own course matches (needed for Remove button)
-- Ownership is established via run_id → course_match_runs.user_id
create policy "Users can delete own course matches"
  on course_matches for delete to authenticated
  using (
    exists (
      select 1 from course_match_runs
      where course_match_runs.id = course_matches.run_id
        and course_match_runs.user_id = auth.uid()
    )
  );
````

## File: supabase/migrations/023_deduplicate_faculty_courses.sql
````sql
-- Migration 023: Deduplicate faculty_courses and add unique constraint
-- ---------------------------------------------------------------------------
-- Keeps the row with the SHORTEST description for each (faculty_id, course_title)
-- pair, then enforces that uniqueness at the DB level.
-- Apply manually via Supabase SQL Editor.

-- Step 1: Normalize whitespace so "Course A" and " Course A" are treated the same
UPDATE faculty_courses
SET course_title = TRIM(course_title)
WHERE course_title IS DISTINCT FROM TRIM(course_title);

-- Step 2: Delete duplicates for non-null faculty_id, keeping shortest description
DELETE FROM faculty_courses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY faculty_id, course_title
        ORDER BY COALESCE(LENGTH(description), 0) ASC, id ASC
      ) AS rn
    FROM faculty_courses
    WHERE faculty_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Unique constraint — one row per (faculty_id, course_title)
ALTER TABLE faculty_courses
  ADD CONSTRAINT faculty_courses_faculty_id_course_title_key
  UNIQUE (faculty_id, course_title);
````

## File: supabase/migrations/024_course_dedupe_term_aware.sql
````sql
-- Migration 024: Replace (faculty_id, course_title) unique constraint with a
-- term+quarter-aware version so distinct offerings of the same course across
-- different terms/quarters are stored as separate rows.
--
-- Previously: UNIQUE (faculty_id, course_title)        [migration 023]
-- New:        UNIQUE (faculty_id, course_title, term, quarter)
--
-- Apply manually via Supabase SQL Editor before running seed-courses.js.
-- -----------------------------------------------------------------------

-- Step 1: Remove existing duplicates that differ only by term/quarter.
--         Keep the row with the longest description for each group.
DELETE FROM faculty_courses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY faculty_id, course_title, term, quarter
        ORDER BY COALESCE(LENGTH(description), 0) DESC, id ASC
      ) AS rn
    FROM faculty_courses
    WHERE faculty_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Drop the old (faculty_id, course_title) unique constraint.
ALTER TABLE faculty_courses
  DROP CONSTRAINT IF EXISTS faculty_courses_faculty_id_course_title_key;

-- Step 3: Add the new term+quarter-aware unique constraint.
--         NULL term/quarter values are treated as distinct (NULLS NOT DISTINCT
--         requires PG 15+; omit if your Supabase version is older — the seeder
--         already deduplicates before insert).
ALTER TABLE faculty_courses
  ADD CONSTRAINT faculty_courses_unique_offering
  UNIQUE (faculty_id, course_title, term, quarter);
````

## File: supabase/migrations/025_profile_topics_to_explore.sql
````sql
-- Add topics_to_explore field for lightweight profile supplementation
-- Used as additional matching context alongside resume_text and professional_interests
ALTER TABLE hbs_ip ADD COLUMN IF NOT EXISTS topics_to_explore text;
````

## File: supabase/migrations/026_saved_faculty_status.sql
````sql
-- Add status column to saved_faculty for lightweight shortlist workflow
-- Existing owner UPDATE policy on saved_faculty covers this column
ALTER TABLE saved_faculty
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'interested'
  CHECK (status IN ('interested', 'researching', 'top_choice', 'emailed', 'not_now'));
````

## File: supabase/migrations/027_product_events.sql
````sql
-- Lightweight beta instrumentation table for tracking key product milestones
CREATE TABLE IF NOT EXISTS product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_name text NOT NULL,
  properties jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events" ON product_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events" ON product_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
````

## File: supabase/migrations/028_saved_faculty_update_policy.sql
````sql
-- Allow authenticated users to update their own saved_faculty rows (e.g. status field)
create policy "Users can update their own saved faculty"
  on saved_faculty for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
````

## File: vite.config.js
````javascript

````

## File: README.md
````markdown
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
````

## File: src/components/Icons.jsx
````javascript
// Shared icon components. All accept a `className` prop unless noted.
⋮----
export function LightbulbIcon(
⋮----
export function ArrowRightIcon(
⋮----
export function XIcon(
⋮----
export function ChevronIcon(
⋮----
export function SparklesIcon(
⋮----
export function RefreshIcon(
⋮----
export function SearchIcon(
⋮----
export function EnvelopeIcon(
⋮----
export function ClipboardIcon(
⋮----
export function CheckIcon(
⋮----
export function TrashIcon(
⋮----
export function BookOpenIcon(
⋮----
/**
 * Bookmark icon with filled/outline states.
 * @param {boolean} filled - Whether the bookmark is saved/active.
 * @param {string} className - Applied to the svg element (controls size & color).
 */
export function BookmarkIcon(
````

## File: src/lib/edgeFunction.js
````javascript
/**
 * Invokes a Supabase edge function with a fresh session token.
 *
 * Handles the repetitive pattern of:
 *   1. Fetching the current session
 *   2. Syncing the token to supabase.functions
 *   3. Invoking the function
 *   4. Extracting the real error message from the raw response body
 *
 * @param {string} fnName       - Edge function name (e.g. 'generate-matches')
 * @param {object} [body]       - JSON body to send
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<object>} Resolved data from the function
 * @throws {Error} With the server-provided message when available
 *         AbortError is re-thrown as-is so callers can detect cancellation.
 */
export async function invokeEdgeFunction(fnName, body, signal)
⋮----
// Re-throw abort errors immediately — don't try to parse the response
⋮----
} catch { /* fall back to generic message */ }
````

## File: src/pages/CourseDirectory.jsx
````javascript
// Short display labels for unit filter pills (mirrors Faculty.jsx)
⋮----
/** Extract the season keyword from a term string like "Fall 2026" → "Fall" */
function termSeason(term)
⋮----
export default function CourseDirectory()
⋮----
// Fetch all catalog courses with joined faculty data.
// The catalog is ~126 grouped offerings; raw rows are ~150–200 after team-teaching.
// Client-side filtering is fine at this scale; add pagination if the catalog grows.
⋮----
// Group raw rows into one card per logical course offering
⋮----
// Distinct units (sorted)
⋮----
// Distinct term seasons (Fall / Spring / Winter / January, in calendar order)
⋮----
// Filter
⋮----
{/* Sticky filter bar */}
⋮----
{/* Search */}
⋮----
{/* Unit pills */}
⋮----
{/* Term pills */}
⋮----
{/* Results header */}
⋮----
{/* Course grid */}
⋮----
// ── Sub-components ─────────────────────────────────────────────────────────────
⋮----
function UnitPill(
⋮----
function TermPill(
⋮----
function CourseCard(
⋮----
{/* Save button */}
⋮----
{/* Title */}
⋮----
{/* Faculty */}
⋮----
{/* Badges */}
⋮----
{/* Description */}
````

## File: supabase/functions/_shared/mod.ts
````typescript
/**
 * Shared utilities for Supabase edge functions.
 * Import via: import { ... } from '../_shared/mod.ts'
 */
⋮----
// ── CORS ──────────────────────────────────────────────────────────────────────
⋮----
export function jsonResponse(body: unknown, status = 200): Response
⋮----
// ── Anthropic API ─────────────────────────────────────────────────────────────
⋮----
/**
 * Calls the Anthropic Messages API via native fetch and returns the text
 * content of the first content block.
 */
export async function callClaude(params: {
  model: string
  max_tokens: number
  temperature: number
  system: string
  messages: Array<{ role: string; content: string }>
}): Promise<string>
⋮----
try { errDetail = JSON.stringify(await res.json()) } catch { /* ignore */ }
⋮----
// ── Auth / API key helpers ────────────────────────────────────────────────────
⋮----
/**
 * Returns a 500 error Response if ANTHROPIC_API_KEY is not set, otherwise null.
 * Call at the top of each edge function handler before doing any work.
 */
export function checkAnthropicKey(): Response | null
⋮----
/**
 * Extracts the Bearer token from the Authorization header, calls getUser, and
 * returns either the authenticated user or a ready-to-return 401 Response.
 *
 * Usage:
 *   const { user, errorResponse } = await requireAuth(req, supabase)
 *   if (errorResponse) return errorResponse
 */
export async function requireAuth(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
): Promise<
⋮----
// deno-lint-ignore no-explicit-any
⋮----
// ── Utilities ─────────────────────────────────────────────────────────────────
⋮----
/** Returns a Date set to the start of the current UTC day (00:00:00.000). */
export function getTodayStart(): Date
⋮----
/**
 * Strips markdown code fences that Claude occasionally wraps JSON responses in.
 * e.g. ```json\n[...]\n``` → [...]
 */
export function cleanJsonResponse(rawText: string): string
````

## File: .gitignore
````
# Local env and Claude Code state
.env
.claude/

# Supabase CLI temp state
supabase/.temp/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Scraper generated output
scripts/enriched_faculty.json
scripts/all_faculty.json
scripts/debug_profile.html
scripts/debug_directory.html
````

## File: src/components/Footer.jsx
````javascript
/**
 * Site footer.
 *
 * Props:
 *   showFeedback — if true, shows the "Share feedback" link (post-login pages only)
 */
export default function Footer(
⋮----
// ── Feedback Modal ─────────────────────────────────────────────────────────────
⋮----
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
⋮----
function FeedbackModal(
⋮----
const [screenshot, setScreenshot] = useState(null)   // File | null
const [previewUrl, setPreviewUrl] = useState(null)   // object URL | null
const [status, setStatus]       = useState('idle')   // idle | submitting | success | error
⋮----
function handleFileChange(e)
⋮----
function removeScreenshot()
⋮----
async function handleSubmit(e)
⋮----
/* Backdrop */
⋮----
{/* Modal */}
⋮----
{/* Header */}
⋮----
{/* Body */}
⋮----
{/* Screenshot upload */}
````

## File: src/lib/constants.js
````javascript
// ── Match strength display ─────────────────────────────────────────────────────
⋮----
/** Chip background/text colors for match strength badges. */
⋮----
/** Left-border accent colors for match strength cards. */
⋮----
/** Human-readable labels for match strength values. */
⋮----
// ── Rate limits ────────────────────────────────────────────────────────────────
⋮----
/** Maximum faculty match runs per user per UTC calendar day. */
⋮----
/** Maximum course match runs per user per UTC calendar day. */
⋮----
/** Maximum email drafts per user per UTC calendar day. */
````

## File: src/pages/ProfileDetail.jsx
````javascript
export default function ProfileDetail()
⋮----
async function load()
⋮----
// RLS ensures this is null if the row belongs to another user
⋮----
// Generate signed URLs in parallel
⋮----
async function handleDelete()
⋮----
// Remove uploaded files from storage first
⋮----
{/* Header */}
⋮----
{/* HBS details */}
⋮----
{/* Research profile */}
⋮----
{/* Additional background */}
⋮----
{/* Uploads */}
⋮----
{/* Metadata */}
⋮----
function Section(
⋮----
function Row(
⋮----
function FileLink(
````

## File: supabase/functions/generate-case-ideas/index.ts
````typescript
/**
 * generate-case-ideas Edge Function
 * ===================================
 * Given a faculty match (by faculty_matches.id) and optional user steering text,
 * generates 2–4 HBS teaching case study ideas the student and faculty member could
 * co-develop together.
 *
 * Rate limit: 3 runs per user per UTC calendar day (tracked via case_idea_runs table).
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Parse body: { match_id, user_context }
 *   3. Check daily rate limit (count case_idea_runs for today)
 *   4. Load faculty_matches row → verify ownership via match_runs.user_id
 *   5. Load faculty profile (tags, pubs, courses, bio) + student hbs_ip
 *   6. Insert case_idea_runs row (counts the attempt before calling Claude)
 *   7. Call Claude Sonnet with structured prompt → parse 2–4 ideas as JSON
 *   8. Return { ideas }
 */
⋮----
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, checkAnthropicKey, requireAuth, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'
⋮----
// ── Main handler ──────────────────────────────────────────────────────────────
⋮----
// ── 0. Guard: API key ─────────────────────────────────────────────────────
⋮----
// ── 1. Authenticate ───────────────────────────────────────────────────────
⋮----
// ── 2. Parse request body ─────────────────────────────────────────────────
⋮----
// ── 3. Rate limit check ───────────────────────────────────────────────────
⋮----
// ── 4. Load faculty_matches row + verify ownership ────────────────────────
⋮----
// Ownership check: the match's run must belong to this user
⋮----
// ── 5. Load faculty data + student profile in parallel ────────────────────
⋮----
// ── 6. Insert case_idea_runs row (counts attempt before calling Claude) ───
⋮----
// ── 7. Build prompt and call Claude ───────────────────────────────────────
⋮----
// ── 8. Parse and validate response ────────────────────────────────────────
````

## File: package.json
````json
{
  "name": "tmp",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.89.0",
    "@supabase/supabase-js": "^2.102.1",
    "dotenv": "^17.4.2",
    "pdfjs-dist": "^5.6.205",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.14.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@tailwindcss/vite": "^4.2.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "supabase": "^2.88.1",
    "tailwindcss": "^4.2.2",
    "vite": "^8.0.4"
  }
}
````

## File: src/lib/utils.js
````javascript
/** Returns 1-2 uppercase initials from a display name. */
export function initials(name)
⋮----
/** Returns the last word of a display name for alphabetical sorting. */
export function lastName(name)
⋮----
/**
 * Returns true when a bio string is actually HBS page navigation/chrome
 * accidentally captured by the scraper (2+ fingerprint phrases present).
 */
export function isNavContent(text)
⋮----
/**
 * Conservative display-side sanitizer for course descriptions.
 * Trims obvious metadata blobs at render time as a backstop against
 * parser artifacts reaching the UI. The primary fix is upstream in
 * the parser (parse-courses.py).
 */
export function sanitizeDescription(desc)
⋮----
/**
 * Groups raw faculty_courses rows into one display object per logical offering.
 *
 * The catalog seed inserts one row per faculty per course, so team-taught courses
 * and same-course-different-rows produce duplicates. This function collapses them.
 *
 * Grouping key: course_number + term + quarter (preferred), falling back to
 * normalized title + term + quarter when course_number is absent.
 *
 * Within each group:
 * - `id` is set to the first row's id (representative for saved_courses semantics)
 * - `description` keeps the longest non-null value across rows
 * - `faculty` aggregates unique faculty members
 *
 * Note on save semantics: saved_courses.course_id points to a specific
 * faculty_courses.id. We use the first row's id as the representative.
 * This is an intentional interim simplification; a proper fix would require
 * a separate courses table.
 */
export function groupCourseRows(rows)
⋮----
// Keep the longest description across rows in this group
⋮----
// Aggregate unique faculty members (prefer joined faculty record over raw name)
````

## File: supabase/functions/generate-email-draft/index.ts
````typescript
/**
 * generate-email-draft Edge Function
 * ====================================
 * Given a faculty_id and a list of saved_case_ideas ids, generates a personalized
 * cold-outreach email from the student to the professor, pitching one or more
 * saved case study ideas.
 *
 * Rate limit: 10 drafts per user per UTC calendar day (tracked via email_draft_runs).
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Parse body: { faculty_id, idea_ids: string[] }
 *   3. Check daily rate limit (count email_draft_runs for today)
 *   4. Load faculty + student profile + selected saved_case_ideas in parallel
 *   5. Insert email_draft_runs row (counts attempt before calling Claude)
 *   6. Call Claude Sonnet with structured prompt → parse { subject, body } JSON
 *   7. Return { subject, body }
 */
⋮----
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, checkAnthropicKey, requireAuth, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'
⋮----
// ── Truncate text to N words ──────────────────────────────────────────────────
function truncateWords(text: string, maxWords: number): string
⋮----
// ── Truncate to N sentences ───────────────────────────────────────────────────
function truncateSentences(text: string, max: number): string
⋮----
// ── Main handler ──────────────────────────────────────────────────────────────
⋮----
// ── 0. Guard: API key ─────────────────────────────────────────────────────
⋮----
// ── 1. Authenticate ───────────────────────────────────────────────────────
⋮----
// ── 2. Parse request body ─────────────────────────────────────────────────
⋮----
// ── 3. Rate limit check ───────────────────────────────────────────────────
⋮----
// ── 4. Load data in parallel ──────────────────────────────────────────────
⋮----
.eq('user_id', user!.id),   // ownership check
⋮----
// Verify all selected ideas belong to the requested faculty — reject cross-faculty selections
⋮----
// ── 5. Insert email_draft_runs row ────────────────────────────────────────
⋮----
// ── 6. Build prompt and call Claude ───────────────────────────────────────
⋮----
// ── 7. Parse and return ───────────────────────────────────────────────────
````

## File: index.html
````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ProFound</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
````

## File: src/components/ProFoundLogo.jsx
````javascript
/**
 * ProFound wordmark
 *
 * Default (light bg): "Pro" in charcoal · "Found" in crimson
 * light=true (dark bg): "Pro" in white · "Found" in white/65
 * Single bold sans-serif word, no icon.
 *
 * Props:
 *   size  — 'sm' (NavBar), 'md' (general), 'lg' (Landing hero)
 *   light — true when rendered on a dark/crimson background
 */
⋮----
export default function ProFoundLogo(
````

## File: src/pages/ProfileNew.jsx
````javascript
function gradYears()
⋮----
export default function ProfileNew()
⋮----
function set(field)
⋮----
async function handleSubmit(e)
⋮----
// ── Shared form sections ────────────────────────────────────────────────────
⋮----
export function PersonalSection(
⋮----
export function HBSSection(
⋮----
export function ResearchSection(
⋮----
export function UploadsSection({
  form, set,
  setResumeFile, setLinkedinPdfFile,
  onResumeText, onLinkedinText,
  existingResume, existingLinkedinPdf,
  hasExistingResumeText, hasExistingLinkedinText,
})
⋮----
const [resumeState, setResumeState]   = useState('idle')   // idle | extracting | done | error
⋮----
async function handleFileChange(file, setFile, onText, setExtractState)
⋮----
function ExtractionStatus(
⋮----
// ── Shared UI primitives ────────────────────────────────────────────────────
⋮----
function UploadedBadge(
⋮----
function InfoTooltip(
⋮----
export function Field(
````

## File: supabase/functions/generate-course-matches/index.ts
````typescript
/**
 * generate-course-matches Edge Function
 * ======================================
 * Matches a student's profile against HBS elective courses and uses Claude
 * to select 2–5 courses with concrete rationale bullets.
 *
 * Mirrors generate-matches closely:
 *   1. Verify JWT → resolve user_id
 *   2. Rate-limit check (course_match_runs, max 3/day)
 *   3. Load user profile from hbs_ip
 *   4. Load all catalog courses from faculty_courses
 *   5. Keyword scoring → top 35 candidates
 *   6. Claude Sonnet selects 2–5 courses with rationale
 *   7. Persist course_match_runs + course_matches rows
 *   8. Return { run_id, matches } with enriched course data
 */
⋮----
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, checkAnthropicKey, requireAuth, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'
⋮----
// ── Stopwords (same set as generate-matches) ──────────────────────────────────
⋮----
function tokenize(text: string): Set<string>
⋮----
// ── Score a course against the user keyword set ───────────────────────────────
function scoreCourse(
  keywords: Set<string>,
  course: {
    course_title: string
    description: string | null
    unit: string | null
    faculty_name: string | null
  }
): number
⋮----
// Title match is highest signal
⋮----
// Unit/area match
⋮----
// Faculty name match (user may have mentioned a professor's research area)
⋮----
// Description word matches
⋮----
// ── Format a course as a compact summary for Claude ───────────────────────────
function formatCourseSummary(c: {
  id: string
  course_title: string
  course_number: string | null
  faculty_name: string | null
  unit: string | null
  term: string | null
  quarter: string | null
  credits: number | null
  description: string | null
}): string
⋮----
// ── Main handler ──────────────────────────────────────────────────────────────
⋮----
// ── 0. Guard: API key ─────────────────────────────────────────────────────
⋮----
// ── 1. Authenticate ───────────────────────────────────────────────────────
⋮----
// ── 1b. Parse optional body ───────────────────────────────────────────────
⋮----
} catch { /* body is optional */ }
⋮----
// ── 2. Rate limit check ───────────────────────────────────────────────────
⋮----
// ── 3. Load user profile ──────────────────────────────────────────────────
⋮----
// ── 4. Load all catalog courses ───────────────────────────────────────────
⋮----
// ── 5. Build keyword set and score courses ────────────────────────────────
⋮----
// Deduplicate courses by course_title+faculty_name for scoring
// (catalog may have multiple rows per course for multi-faculty)
⋮----
const key = c.id  // each row is its own entry
⋮----
// Build set of allowed course IDs (only candidates actually sent to Claude)
⋮----
// ── 6. Build prompt and call Claude ──────────────────────────────────────
⋮----
// ── 7. Parse and validate Claude response ────────────────────────────────
⋮----
// ── 8. Write to DB ────────────────────────────────────────────────────────
⋮----
// ── 9. Return enriched matches ────────────────────────────────────────────
````

## File: src/index.css
````css
@theme {
⋮----
*, *::before, *::after {
⋮----
body {
⋮----
#root {
⋮----
.animate-fade-in {
````

## File: CLAUDE.md
````markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## Project Overview

**ProFound** — A React + Supabase web app that matches Harvard Business School doctoral students with faculty based on shared research interests. Students create a profile (with resume/LinkedIn PDF upload), browse faculty, run an AI-powered matching tool, generate case study ideas with matched faculty, and save ideas for later.

**Stack:** Vite + React, react-router-dom v7, Tailwind v4 (with `@theme` in `src/index.css`, no `tailwind.config.js`), Supabase (auth, DB, storage, Edge Functions), Claude `claude-sonnet-4-5` via Anthropic API (Edge Functions), Google OAuth.

**Dev server:** `npm run dev` → `localhost:5173`  
**Branch:** `main` (all commits local only — never pushed to remote)

---

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (localhost:5173)
npm run build        # production build
npm run lint         # lint
```

---

## Environment

**Client-side** credentials live in `.env` (gitignored):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

**Supabase Edge Function secrets** (set in Supabase Dashboard → Edge Functions → Secrets — NOT in `.env`):

```
ANTHROPIC_API_KEY=        # Required by both generate-matches and generate-case-ideas
```

Without `ANTHROPIC_API_KEY` set as an Edge Function secret, matching and case idea generation will fail with a 500 error.

---

## Key Source Files

| File | Description |
|---|---|
| `src/lib/supabase.js` | Supabase client singleton — import from here everywhere |
| `src/lib/hooks.js` | Shared hooks: `useRequireAuth()` (auth redirect, returns session), `useSavedFaculty(session)`, `useSavedCourses(session)` (optimistic save toggles), `useIsAdmin()` (admin role check), `useFilterFade(dep)` (150ms opacity fade on filter change) |
| `src/lib/utils.js` | `initials(name)` (1-2 uppercase initials) and `lastName(name)` (for alphabetical sort) |
| `src/lib/pdf.js` | `extractPdfText(file)` — client-side PDF text extraction via `pdfjs-dist`, capped at 15,000 chars (~5-6 pages). Called during profile create/edit when a PDF is uploaded. |
| `src/index.css` | Tailwind v4 theme (`@theme` block with brand colors) |
| `supabase/functions/generate-matches/index.ts` | Matching Edge Function + Claude prompt (see details below) |
| `supabase/functions/generate-case-ideas/index.ts` | Case ideas Edge Function + Claude prompt (see details below) |
| `public/profound-logo.svg` | Standalone saveable logo — `<img>` tag on landing page enables right-click → "Save image as" |
| `public/favicon.svg` | Site favicon |
| `public/icons.svg` | SVG icon sprite (if used) |
| `index.html` | Google Fonts `<link>` loads Inter only — Instrument Serif has been removed |

> **Note:** There is no `src/hooks/useAuth.js`. The hooks file is `src/lib/hooks.js`.

---

## Database Schema (17 migrations applied locally)

> **Note:** Migrations are applied manually via Supabase SQL Editor (not via CLI), since the project is not linked to a remote Supabase project via CLI.

### Tables

| Table | Purpose |
|---|---|
| `hbs_ip` | **Student profiles** (non-obvious name) — see full field list below |
| `faculty` | ~303 HBS faculty — core identity fields only (tags/publications/courses are in separate tables) |
| `faculty_tags` | Research keyword tags per faculty (`faculty_id`, `tag`, `source`) |
| `faculty_publications` | Publications per faculty (`faculty_id`, `title`, `year`, `pub_type`, `journal`, `url`) |
| `faculty_courses` | Courses taught per faculty (`faculty_id`, `course_title`, `description`, `unit`, `term`, `quarter`, `credits`) |
| `saved_faculty` | Student bookmarks of faculty — one row per (user_id, faculty_id) pair |
| `match_runs` | One row per AI matching run (`user_id`, `created_at`) — rate-limiting anchor |
| `faculty_matches` | Individual faculty results within a run — see field list below. **The `id` here is what the app calls "matchId"** (used in `/case-ideas/:matchId` route and throughout) |
| `case_idea_runs` | Rate-limit log for idea generation — `user_id`, `match_id`, `created_at` |
| `saved_case_ideas` | Persisted case study ideas — see field list below |
| `feedback` | User feedback — `user_id`, `message` (no email stored) |

### `hbs_ip` fields (built up across migrations 001, 003, 004, 014)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users (unique — one profile per user) |
| `first_name` | text | not null |
| `last_name` | text | not null |
| `email` | text | not null, unique, validated |
| `graduation_year` | integer | not null, 2026–current+10 |
| `hbs_section` | text | A–J |
| `resume_path` | text | Storage path e.g. `{user_id}/resume.pdf` |
| `linkedin_pdf_path` | text | Storage path e.g. `{user_id}/linkedin.pdf` |
| `professional_interests` | text | Free-text interests/goals — **primary matching input** |
| `linkedin_url` | text | Public LinkedIn URL |
| `program` | text | 'MBA' / 'Executive Education' / 'Other' |
| `program_other` | text | Free-text when program = 'Other' |
| `faculty_in_mind` | text | Optional faculty names the student already has in mind — used in keyword scoring |
| `website_urls` | text | Personal websites (newline-separated) |
| `additional_background` | text | Background not captured in resume or LinkedIn — **secondary matching input** |
| `resume_text` | text | Client-side extracted text from resume PDF — **matching input** |
| `linkedin_text` | text | Client-side extracted text from LinkedIn PDF — **matching input** |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

> The `generate-matches` Edge Function sends `professional_interests`, `additional_background`, `faculty_in_mind`, `resume_text`, and `linkedin_text` to Claude.

### `faculty` columns

`id`, `hbs_fac_id` (unique HBS URL ID), `name`, `title` (named professorship/rank), `unit` (HBS academic unit), `email`, `bio`, `profile_url`, `image_url`, `created_at`

Tags, publications, and courses are in **separate tables** (`faculty_tags`, `faculty_publications`, `faculty_courses`) — not columns on `faculty`.

### `faculty_matches` columns

`id`, `run_id` (→ match_runs), `faculty_id` (→ faculty), `rank` (integer, 1 = strongest), `match_strength` ('strong' / 'good' / 'exploratory'), `match_reasons` (text[]), `collaboration_ideas` (text[]), `created_at`

> There are no `score` or `rationale` columns — those are older names no longer in use.

### `saved_case_ideas` columns

`id`, `user_id`, `match_id` (→ faculty_matches **ON DELETE CASCADE**), `faculty_id` (denormalized → faculty **ON DELETE CASCADE**), `title`, `premise`, `protagonist`, `teaching_themes` (text[]), `student_angle`, `faculty_angle`, `created_at`

### Cascade behavior

`saved_case_ideas.match_id` references `faculty_matches.id ON DELETE CASCADE` — unmatching a faculty member automatically deletes all their saved case study ideas server-side.

### RLS

RLS is enabled on every table. Key policies:
- `hbs_ip`: SELECT/INSERT/UPDATE/DELETE by owner only
- `faculty`, `faculty_tags`, `faculty_publications`, `faculty_courses`: SELECT by any authenticated user (read-only)
- `saved_faculty`: SELECT/INSERT/DELETE by owner
- `match_runs`: SELECT/INSERT by owner
- `faculty_matches`: SELECT/INSERT by owner; DELETE by owner (powers unmatch feature)
- `saved_case_ideas`: SELECT/INSERT/DELETE by owner
- `case_idea_runs`: SELECT/INSERT by owner
- `feedback`: INSERT only for authenticated users; no SELECT for regular users (service role reads)
- `storage.objects` (student-files bucket): INSERT/SELECT/UPDATE/DELETE scoped to `{user_id}/%`

### Rate limits

- **Matching:** 3 runs per user per UTC calendar day (enforced in `generate-matches` Edge Function via `DAILY_LIMIT = 3`; client-side also reads `match_runs` to show remaining count)
- **Case ideas:** 3 generations per user per UTC calendar day (enforced in `generate-case-ideas` Edge Function via `DAILY_LIMIT = 3`, tracked by `user_id` in `case_idea_runs`)

### Storage

One bucket — `student-files` (private, not public). Files stored at:
- `{user_id}/resume.pdf`
- `{user_id}/linkedin.pdf`

Text is extracted client-side via `src/lib/pdf.js` before upload and saved to `resume_text` / `linkedin_text`.

### RPC functions (migration 011)

- `get_research_tags()` → `{tag, faculty_count}[]` — returns all tags sorted by faculty count. Used to populate the topic filter pills on `/faculty`.
- `get_faculty_by_tag(tag_name text)` → `{faculty_id}[]` — returns faculty IDs by tag (server-side filtering fallback).

---

## Edge Functions

Both functions use native `fetch` to call the Anthropic API (no SDK import) and use `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase runtime, not in `.env`).

### `generate-matches` (`supabase/functions/generate-matches/index.ts`)

1. Verify JWT → resolve user_id
2. Check rate limit: 3 runs per UTC day via `match_runs`
3. Load student profile from `hbs_ip`
4. Load all faculty with tags, publications, courses
5. **Keyword scoring** — tokenizes student text, scores all ~303 faculty, selects top 20 candidates
6. Call Claude `claude-sonnet-4-5` with student profile + top 20 faculty summaries → returns JSON array of 2–6 matches with `faculty_id`, `rank`, `match_strength`, `match_reasons[]`, `collaboration_ideas[]`
7. Insert into `match_runs` + `faculty_matches`
8. Return `{ run_id, matches }` (enriched with faculty data)

### `generate-case-ideas` (`supabase/functions/generate-case-ideas/index.ts`)

1. Verify JWT → resolve user_id
2. Parse body: `{ match_id, user_context }` (user_context is optional steering text, max 1000 chars)
3. Check rate limit: 3 per user per UTC day via `case_idea_runs`
4. Load `faculty_matches` row + verify ownership via `match_runs.user_id`
5. Load faculty tags/publications/courses + student profile in parallel
6. Insert `case_idea_runs` row (counts attempt before calling Claude)
7. Call Claude `claude-sonnet-4-5` → returns JSON array of 2–4 case study ideas with `title`, `premise`, `protagonist`, `teaching_themes[]`, `student_angle`, `faculty_angle`
8. Return `{ ideas, runsToday }`

### `generate-course-matches` (`supabase/functions/generate-course-matches/index.ts`)

1. Verify JWT → resolve user_id
2. Check rate limit: 5 runs per UTC day via `course_match_runs`
3. Load student profile from `hbs_ip`
4. Load all catalog courses from `faculty_courses`
5. **Keyword scoring** → top 35 candidates
6. Call Claude `claude-sonnet-4-5` → returns JSON array of 2–5 courses with `course_id`, `rank`, `match_strength`, `match_reasons[]`
7. Insert into `course_match_runs` + `course_matches`
8. Return `{ run_id, matches }` (enriched with course data)

### `generate-email-draft` (`supabase/functions/generate-email-draft/index.ts`)

1. Verify JWT → resolve user_id
2. Parse body: `{ faculty_id, idea_ids: string[] }`
3. Check rate limit: 10 drafts per UTC day via `email_draft_runs`
4. Load faculty + student profile + selected `saved_case_ideas` in parallel; rejects cross-faculty idea selections
5. Insert `email_draft_runs` row (counts attempt before calling Claude)
6. Call Claude `claude-sonnet-4-5` → parse `{ subject, body }` JSON; trims and caps subject (200 chars) / body (5000 chars)
7. Return `{ subject, body }`

---

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `Landing.jsx` | Public — ProFound logo (`<img src="/profound-logo.svg">`), tagline, GitHub sign-in, crimson gradient, copyright-only footer |
| `/auth/callback` | `AuthCallback.jsx` | Google OAuth callback handler |
| `/dashboard` | `Dashboard.jsx` | Four sections: Your Profile, My Matches (with unmatch), Saved Case Study Ideas, My Saved Faculty |
| `/profile/new` | `ProfileNew.jsx` | Create student profile — all `hbs_ip` fields + resume/LinkedIn PDF upload |
| `/profile/edit` | `ProfileEdit.jsx` | Edit student profile |
| `/profile/:id` | `ProfileDetail.jsx` | View any student profile |
| `/faculty` | `Faculty.jsx` | Browse all ~303 HBS faculty — research topic multi-select filter (via `get_research_tags()` RPC), sort, bookmark |
| `/faculty/:id` | `FacultyDetail.jsx` | Faculty detail — bio, publications, courses, tags |
| `/match` | `Matching.jsx` | AI matching — run match (3/day limit), view results with match strength filter, archive of past runs, bookmark faculty, generate case ideas CTA, unmatch per card |
| `/case-ideas/:matchId` | `CaseStudyIdeas.jsx` | Generate and save case study ideas for a specific faculty match |

All authenticated routes are wrapped in `<Layout>` in `main.jsx`, which appends `<Footer showFeedback={true} />`.

---

## Components

| File | Description |
|---|---|
| `NavBar.jsx` | Sticky, white bg (`bg-white border-b border-gray-200`), `ProFoundLogo size="sm"`, nav links (Dashboard / Faculty / Matching / My Profile), user greeting (from `hbs_ip.first_name`, falls back to GitHub metadata), sign out. No "Harvard Business School" text. |
| `ProFoundLogo.jsx` | Inline-flex logo: "Pr" (charcoal bold system-ui) + SVG magnifying glass + "Found" (crimson). Three sizes: sm/md/lg. See logo details below. |
| `ProfFoundLogo.jsx` | Old fedora hat logo — **unused**, kept for reference only |
| `Footer.jsx` | `showFeedback={false}` → copyright only (`© 2026 ProFound, LLC. All rights reserved.`). `showFeedback={true}` → adds "Share feedback" button that opens `FeedbackModal` (submits to `feedback` table, no email stored) |
| `Layout.jsx` | React **fragment** only: `<>{children}<Footer showFeedback={true} /></>` — **must stay a fragment**. Authenticated pages already have `min-h-screen` internally; wrapping in a flex column would push the footer below the fold. |

---

## Logo Details

**`ProFoundLogo.jsx` (on-screen rendering):**
- Outer `<span>`: `display: inline-flex`, `alignItems: flex-end` — all children bottom-align
- SVG: `marginBottom: '0.083em'` (= F/12 for system-ui on Windows, derived from `canvas.fontBoundingBoxAscent/Descent` — places circle bottom precisely on text baseline)
- Circle: `cx=9 cy=12 r=8` in 20×20 viewBox → bottom at y=20 = SVG element bottom = text baseline
- Network nodes: equilateral triangle at radius 5 from center — top (9,7), lower-left (4.7,14.5), lower-right (13.3,14.5)
- Handle: (15.4,18.4)→(22,25), `overflow:visible`
- Lens fill: `rgba(165,28,48,0.06)` subtle crimson tint
- Sizes: sm (1.05rem, iconSize 11px), md (1.5rem, 16px), lg (4.5rem, 47px)
- Typography set on outer span so `em` units in marginBottom resolve against the logo's own font-size

**`public/profound-logo.svg` (right-click saveable):**
- Pure SVG at 80px font-size, viewBox `0 0 380 116`
- Text widths calibrated to Windows/Segoe UI via canvas `measureText`: "Pr" 77.76px, icon 52px (scale 2.6), "Found" 228.8px, baseline y=94
- Landing page hero: `<img src="/profound-logo.svg" style={{ height:'6.5rem' }}>` — `<img>` tag (not the React component) enables right-click → "Save image as"
- Text is not outlined — spacing may shift slightly on non-Windows systems

**Brand colors** (defined in `src/index.css` via `@theme`):
- `--color-crimson: #A51C30` → use as `text-crimson`, `bg-crimson`, `hover:bg-crimson-dark`
- `--color-crimson-dark: #8B1628`

---

## Security Rules (non-negotiable)

- **RLS on every table** — Enable Row Level Security on every new table, no exceptions.
- **Session checks on every protected page** — Every route that requires authentication must call `useRequireAuth()` from `src/lib/hooks.js` before rendering.
- **No cross-user data exposure** — RLS policies must ensure users can only read/write their own data.
- **Env vars for all secrets** — No keys, tokens, or credentials in source code. `ANTHROPIC_API_KEY` goes in Supabase Edge Function secrets, not `.env`.

---

## Updating Course Catalog Data

**Canonical pipeline:** `parse-courses.py` → `seed-courses.js`

The legacy paths (`parse_course_catalog.py` + `import-courses.mjs`) are deprecated — do not use them.

### Full refresh steps

1. **Update the raw text** — place the new catalog text in `scripts/courses_raw.txt`.

2. **Parse** — run from repo root:
   ```bash
   python scripts/parse-courses.py
   ```
   Outputs:
   - `scripts/courses_data.json` — all parsed courses
   - `scripts/course_parse_review.json` — suspicious rows flagged by the QA pass

3. **Review the QA output** — open `scripts/course_parse_review.json` and check any flagged rows (titles that are too long, descriptions that start with metadata, etc.) before seeding.

4. **Apply migration 024** (first time only, or after a schema change) — paste `supabase/migrations/024_course_dedupe_term_aware.sql` into the Supabase SQL Editor and run it. This replaces the old `UNIQUE (faculty_id, course_title)` constraint with a term+quarter-aware one so the same course can appear in multiple terms.

5. **Re-seed the DB** — run:
   ```bash
   node scripts/seed-courses.js
   ```
   The script deletes all existing `hbs_catalog_2026` rows, deduplicates by `(faculty_id, normalized_title, term, quarter)` keeping the longest description, logs unmatched faculty names, and re-inserts.

### Known limitations

- Parser reads pre-extracted plain text from `scripts/courses_raw.txt`. If you regenerate this from the PDF (using `parse_courses.py` or another tool), review the QA output carefully for new artifact patterns.
- Faculty name matching is fuzzy (exact normalized name → last-name fallback). Unmatched names are logged to the console. The QA review file does not cover matching failures.
- `course_parse_review.json` is a best-effort heuristic scan — it may miss subtle bleed issues. Always spot-check a few faculty detail pages after re-seeding.

---

## Pending / Future Work

- **Push to remote** — All commits are local only; run `git push origin main` when ready to deploy
- **Feedback review UI** — Admin interface to read `feedback` table (currently only readable via Supabase Table Editor with service role)
- **Logo portability** — `profound-logo.svg` uses live system fonts (not outlined paths); use Inkscape/Figma to convert text to paths for a truly portable file
- **Matching quality** — Prompt lives in `supabase/functions/generate-matches/index.ts`; keyword scoring stopword list is in the same file
- **Instrument Serif removed** — font was previously loaded in `index.html` and defined as `--font-serif` in `src/index.css`; both have been cleaned up
````

## File: src/pages/ProfileEdit.jsx
````javascript
function wordCount(text)
⋮----
function InputQualityBadge(
⋮----
function MatchingInputsPanel(
⋮----
function toggleOpen()
⋮----
{/* Resume */}
⋮----
{/* LinkedIn */}
⋮----
{/* Topics to explore */}
⋮----
export default function ProfileEdit()
⋮----
async function load()
⋮----
// Pre-load previously extracted text so it isn't lost if user doesn't re-upload
⋮----
function set(field)
⋮----
async function handleSubmit(e)
````

## File: src/pages/CourseMatch.jsx
````javascript
function formatDate(iso)
⋮----
export default function CourseMatch()
⋮----
const [pageState, setPageState] = useState('loading')   // loading | no-profile | ready | running | results
⋮----
const abortControllerRef = useRef(null)                // for cancelling in-flight requests
⋮----
// "How it works" — open by default on first visit, collapsed thereafter
⋮----
// Set of faculty_ids the user has matched (for badge display)
⋮----
// Load profile + run history + matched faculty on mount
⋮----
async function load()
⋮----
// Load all faculty_ids from this user's faculty matches (for badge display)
⋮----
// Build matched faculty set
⋮----
// Cycle loading messages
⋮----
async function handleRun()
⋮----
// User cancelled — silently restore previous state, no error shown
⋮----
function handleCancelRun()
⋮----
async function handleSelectRun(runId)
⋮----
async function handleRemoveCourse(matchId)
⋮----
// ── Render states ──────────────────────────────────────────────────────────
⋮----
// ── State: ready ──────────────────────────────────────────────────────────
⋮----
{/* Hero */}
⋮----
{/* How it works — collapsible, closed after first visit */}
⋮----
{/* Optional elective interests */}
⋮----
{/* Profile nudge */}
⋮----
// ── State: results ─────────────────────────────────────────────────────────
⋮----
{/* Header */}
⋮----
{/* Elective interests — persisted and visible for re-run */}
⋮----
{/* Summary banner */}
⋮----
{/* Strong match callout */}
⋮----
{/* Next-step guidance */}
⋮----
{/* Strength filter pills */}
⋮----
{/* Course cards */}
⋮----
{/* Archive */}
⋮----
// ── Course card ────────────────────────────────────────────────────────────────
⋮----
function CourseCard(
⋮----
{/* Header: title + badges */}
⋮----
{/* Professor line */}
⋮----
{/* Faculty match badge */}
⋮----
{/* Right-side metadata badges */}
⋮----
{/* Unit/area */}
⋮----
{/* Description */}
⋮----
{/* Rationale */}
⋮----
{/* Footer actions */}
````

## File: supabase/functions/generate-matches/index.ts
````typescript
/**
 * generate-matches Edge Function
 * ================================
 * Analyzes a user's profile (text fields + pre-extracted PDF text) against
 * all faculty profiles, then uses Claude Sonnet to select 2–10 ranked matches
 * with qualitative reasoning and collaboration ideas.
 *
 * Uses Deno's native fetch to call the Anthropic API directly — no SDK import
 * needed, which avoids npm/Deno compatibility issues in the Edge Runtime.
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Load user profile from hbs_ip
 *   3. Load all faculty with tags, publications, courses
 *   4. Keyword scoring to narrow to top 20 candidates
 *   5. Claude Sonnet selects final 2–10 matches with reasoning
 *   6. Write match_runs + faculty_matches rows to DB
 *   7. Return { run_id, matches }
 */
⋮----
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, checkAnthropicKey, requireAuth, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'
⋮----
// ── Stopwords filtered out of keyword tokenization ────────────────────────────
⋮----
function tokenize(text: string): Set<string>
⋮----
// ── Score a faculty member against the user keyword set ───────────────────────
function scoreFaculty(
  keywords: Set<string>,
  faculty: { bio: string | null; tags: string[]; pubTitles: string[] },
  facultyNameInMind: string
): number
⋮----
// ── Format a faculty record as a compact summary for Claude ───────────────────
function formatFacultySummary(f: {
  id: string; name: string; unit: string | null; bio: string | null
  tags: string[]; pubTitles: string[]; courseTitles: string[]
}): string
⋮----
// ── Main handler ──────────────────────────────────────────────────────────────
⋮----
// ── 0. Guard: API key must be configured ──────────────────────────────────
⋮----
// ── 1. Authenticate ───────────────────────────────────────────────────────
⋮----
// ── 1b. Rate limit check ──────────────────────────────────────────────────
// TODO: Rate limiting is count-then-insert and not atomic under concurrency.
// Future improvement: DB-side RPC with transactional check-and-insert.
⋮----
// ── 2. Load user profile ──────────────────────────────────────────────────
⋮----
// ── 3. Load faculty data ──────────────────────────────────────────────────
⋮----
// Group by faculty_id
⋮----
// ── 4. Build keyword set and score faculty ────────────────────────────────
⋮----
// Build set of allowed faculty IDs (only candidates actually sent to Claude)
⋮----
// ── 5. Build prompt and call Claude ──────────────────────────────────────
⋮----
// ── 6. Parse and validate Claude response ────────────────────────────────
⋮----
// ── 7. Write to DB ────────────────────────────────────────────────────────
⋮----
// ── 8. Return enriched matches ────────────────────────────────────────────
````

## File: src/lib/hooks.js
````javascript
/**
 * Returns true if the current user is in the admins table, false if not,
 * and null while the check is still in flight.
 */
export function useIsAdmin()
⋮----
/**
 * Redirects unauthenticated users to the landing page.
 * Returns the Supabase session once resolved, or null while the check is in flight.
 * Subscribes to auth state changes so sign-outs propagate without a page reload.
 */
export function useRequireAuth()
⋮----
// Initial session check
⋮----
// Subscribe to future auth changes (e.g. sign-out in another tab)
⋮----
// ── Generic saved-items hook ──────────────────────────────────────────────────
⋮----
/**
 * Internal generic hook for saved-item sets backed by a Supabase table.
 * Handles load, optimistic toggle, and rollback for both insert and delete failures.
 *
 * @param {string} tableName  - e.g. 'saved_faculty'
 * @param {string} fieldKey   - the ID column name, e.g. 'faculty_id'
 * @param {object|null} session - Supabase session from useRequireAuth
 */
function useSavedItems(tableName, fieldKey, session)
⋮----
async function toggle(itemId)
⋮----
// Determine current state from the latest set to avoid stale-closure bugs
⋮----
// Re-read the current saved state to decide which DB op to run
// We use a local snapshot before the optimistic update for the decision
⋮----
// Rollback: restore the item
⋮----
// Rollback: remove the item
⋮----
// ── Public wrappers ───────────────────────────────────────────────────────────
⋮----
/**
 * Loads the current user's saved faculty IDs and provides a toggle function.
 * Uses optimistic updates — local state changes immediately, DB call follows.
 *
 * Usage:
 *   const { savedIds, toggleSave } = useSavedFaculty(session)
 *   savedIds.has(facultyId)   // boolean
 *   toggleSave(facultyId)     // async, no return value needed
 */
export function useSavedFaculty(session)
⋮----
// status map: facultyId → status string
⋮----
async function updateStatus(facultyId, status)
⋮----
// Optimistic
⋮----
// Rollback to previous value
⋮----
/**
 * Loads the current user's saved course IDs and provides a toggle function.
 * Mirrors useSavedFaculty — uses optimistic updates.
 *
 * Usage:
 *   const { savedCourseIds, toggleSaveCourse } = useSavedCourses(session)
 *   savedCourseIds.has(courseId)   // boolean
 *   toggleSaveCourse(courseId)     // async
 */
export function useSavedCourses(session)
⋮----
export function useFilterFade(dep)
````

## File: src/pages/SavedIdeas.jsx
````javascript
export default function SavedIdeas()
⋮----
// Per-faculty draft panel state: { [facultyId]: { open, selectedIds, loading, subject, body, error, copied } }
⋮----
// Group ideas by faculty
⋮----
// ── Delete handlers ───────────────────────────────────────────────────────────
async function handleDelete(ideaId)
⋮----
// ── Draft panel state helpers ─────────────────────────────────────────────────
function getDraftState(fid)
⋮----
selectedIds: null,   // null = not yet initialized (use all by default on first open)
⋮----
function patchDraftState(fid, patch)
⋮----
// Pre-select all ideas in this group on first open
⋮----
// ─────────────────────────────────────────────────────────────────────────────
⋮----
{/* Header */}
⋮----
{/* Content */}
⋮----
{/* Faculty group header */}
⋮----
{/* Status picker */}
⋮----
{/* Draft panel */}
⋮----
{/* Pre-draft tips */}
⋮----
{/* Idea checklist */}
⋮----
{/* Tone presets */}
⋮----
{/* Error */}
⋮----
{/* Draft result */}
⋮----
{/* Ideas for this faculty */}
⋮----
// ── Saved idea card ────────────────────────────────────────────────────────────
⋮----
function SavedIdeaCard(
⋮----
{/* Match link + delete */}
⋮----
{/* Title */}
⋮----
{/* Protagonist chip */}
⋮----
{/* Premise */}
````

## File: src/pages/CaseStudyIdeas.jsx
````javascript
export default function CaseStudyIdeas()
⋮----
// Daily run counter for rate-limit UX
⋮----
// Saved ideas — Map<idea._key, saved_case_ideas.id | 'optimistic'>
// _key is derived from title+premise+protagonist for stable identity across duplicate titles
⋮----
const [savingIdeaKey, setSavingIdeaKey] = useState(null)  // _key of in-flight save
⋮----
// Email draft state
⋮----
// ── Load match data + today's run count + existing saves ─────────────────────
⋮----
async function load()
⋮----
// ── Cycle loading messages ────────────────────────────────────────────────────
⋮----
// ── Generate ideas ────────────────────────────────────────────────────────────
⋮----
// Assign stable composite key to each idea for save/unsave identity
⋮----
// Optimistic increment so button disables immediately after 3rd run
⋮----
// Preserve saved state for ideas that still exist; clear orphaned keys
⋮----
// ── Save / unsave handlers ────────────────────────────────────────────────────
⋮----
// Optimistic
⋮----
// Optimistic
⋮----
// ── Email draft handlers ──────────────────────────────────────────────────────
⋮----
// ── Loading / not-found states ────────────────────────────────────────────────
⋮----
{/* Breadcrumb */}
⋮----
{/* Page title */}
⋮----
{/* Explanation paragraph */}
⋮----
{/* Compact faculty reference card */}
⋮----
{/* Avatar */}
⋮----
{/* Draft email button */}
⋮----
{/* Email draft panel */}
⋮----
{/* Rate limit banner */}
⋮----
{/* Idea checklist */}
⋮----
{/* Pre-draft tips */}
⋮----
{/* Tone presets */}
⋮----
{/* Generate button */}
⋮----
{/* Draft error */}
⋮----
{/* Draft result */}
⋮----
{/* Match context panel */}
⋮----
{/* Steering input + generate button */}
⋮----
{/* Runs remaining counter */}
⋮----
{/* Generating spinner */}
⋮----
{/* Error banner */}
⋮----
{/* Ideas */}
⋮----
{/* Empty state after generation */}
⋮----
// ── Idea card ──────────────────────────────────────────────────────────────────
⋮----
function IdeaCard(
⋮----
{/* Number + title + bookmark */}
⋮----
{/* Protagonist chip */}
⋮----
{/* Premise */}
⋮----
{/* Teaching themes */}
⋮----
{/* Student angle */}
⋮----
{/* Faculty angle */}
````

## File: src/main.jsx
````javascript
class AppErrorBoundary extends Component
⋮----
static getDerivedStateFromError()
componentDidCatch(error, info)
render()
⋮----
function ScrollToTop()
⋮----
{/* Public — Landing handles its own layout + footer */}
⋮----
{/* Authenticated — Layout appends the feedback-enabled footer */}
````

## File: src/components/NavBar.jsx
````javascript
export default function NavBar()
⋮----
async function handleSignOut()
⋮----
const navLink = (to, label) =>
⋮----
{/* Left: logo */}
⋮----
{/* Center: nav links — stretch to full nav height so border-b sits at the bar bottom */}
⋮----
{/* Right: user + sign out */}
````

## File: src/pages/Landing.jsx
````javascript
export default function Landing()
⋮----
// Email/password form state
const [mode, setMode] = useState('signin') // 'signin' | 'signup'
⋮----
async function handleGoogleSignIn()
⋮----
async function handleEmailAuth(e)
⋮----
function switchMode(newMode)
⋮----
{/* ── Left panel: brand ── */}
⋮----
{/* Subtle dot-grid texture */}
⋮----
{/* Soft vignette to ground the content */}
⋮----
{/* Main copy — vertically centred */}
⋮----
{/* Wordmark — the focal point */}
⋮----
{/* Feature list */}
⋮----
{/* ── Right panel: auth ── */}
⋮----
{/* Mobile-only: logo + headline */}
⋮----
{/* Heading (desktop only) */}
⋮----
{/* Auth card */}
⋮----
{/* Google — primary CTA */}
⋮----
{/* Divider */}
⋮----
{/* Email/password — secondary */}
⋮----
{/* Mobile feature strip */}
⋮----
function GoogleIcon()
````

## File: src/pages/Faculty.jsx
````javascript
// Short display labels for unit filter pills
⋮----
export default function Faculty()
⋮----
async function load()
⋮----
// Sorted unique units
⋮----
// Tags on 4+ faculty, sorted by frequency
⋮----
function toggleTag(tag)
function clearTags()
⋮----
// Filter
⋮----
// Sort — unit filter always shows A-Z regardless of the sort selector
⋮----
{/* Header skeleton */}
⋮----
{/* Filter bar skeleton */}
⋮----
{/* Card grid skeleton */}
⋮----
{/* ── Sticky filter bar ── */}
⋮----
{/* Row 1: search · research topics dropdown · sort */}
⋮----
{/* Sort selector */}
⋮----
{/* Row 2: unit pills */}
⋮----
{/* Row 3: active topic chips */}
⋮----
{/* ── Main content ── */}
⋮----
{/* Header */}
⋮----
{/* Results count */}
⋮----
{/* Faculty grid */}
⋮----
// ── Research Topics dropdown ──────────────────────────────────────────────────
⋮----
function ResearchTopicsDropdown(
⋮----
function handleMousedown(e)
function handleKeydown(e)
⋮----
// ── Faculty card ──────────────────────────────────────────────────────────────
⋮----
function FacultyCard(
⋮----
{/* Save button with tooltip */}
⋮----
{/* Unit badge */}
⋮----
{/* Photo + name row */}
⋮----
{/* Bio excerpt */}
⋮----
{/* Research tag pills — only popular tags are clickable */}
⋮----
{/* Footer */}
⋮----
// ── Skeleton card ─────────────────────────────────────────────────────────────
⋮----
function SkeletonCard()
⋮----
{/* Unit badge */}
⋮----
{/* Photo + name */}
⋮----
{/* Bio */}
⋮----
{/* Tags */}
⋮----
{/* Footer */}
⋮----
// ── UI primitives ─────────────────────────────────────────────────────────────
⋮----
function UnitPill(
````

## File: src/pages/FacultyDetail.jsx
````javascript
export default function FacultyDetail()
⋮----
async function load()
⋮----
// Fetch faculty row, tags, publications, and courses in parallel
⋮----
// Ordered list of pub types present for this faculty
⋮----
{/* Back */}
⋮----
{/* Header card */}
⋮----
{/* Avatar */}
⋮----
{/* Identity */}
⋮----
{/* Links row */}
⋮----
{/* Bio */}
⋮----
{/* Research tags */}
⋮----
{/* Courses — grouped to deduplicate team-taught/multi-term rows */}
⋮----
{/* Publications */}
⋮----
{/* Type filter pills — only shown when 2+ types exist */}
⋮----
// ── Sub-components ────────────────────────────────────────────────────────────
⋮----
function Section(
⋮----
function PubTypePill(
⋮----
function CourseRow(
⋮----
function PublicationRow(
⋮----
/**
 * Strip the name/title header that HBS profile pages inject at the top of bio text.
 * Pattern: "[Name] [Title] [Title] [Name] actual bio..."
 * Detected by: bio starts with first name AND title appears near the start.
 */
function stripBioHeader(bio, name, title)
⋮----
const firstName = nameParts[0].replace(/\.$/, '')   // e.g. "J." → "J"
⋮----
// Only attempt stripping when bio starts with the faculty's first name
⋮----
// Confirm the title also appears near the top (header pattern, not normal prose)
⋮----
// Find the second occurrence of the last name — that's where the real bio begins
⋮----
function truncateBio(text, maxSentences = 4)
````

## File: src/pages/Matching.jsx
````javascript
// Active filter pill colors mirror the chip colors
⋮----
function formatDate(iso)
⋮----
export default function Matching()
⋮----
const [pageState, setPageState] = useState('loading')  // loading | no-profile | ready | running | results
⋮----
const [runs, setRuns] = useState([])                   // all runs for this user, newest first
const [matches, setMatches] = useState([])             // current displayed matches
const [selectedRunId, setSelectedRunId] = useState(null)  // null = latest
⋮----
const [filterStrength, setFilterStrength] = useState(null)  // null = all
const [runsToday, setRunsToday] = useState(0)          // for 3/day rate limit UX
⋮----
const abortControllerRef = useRef(null)                // for cancelling in-flight requests
⋮----
const [usefulResponse, setUsefulResponse] = useState(null) // null | 'yes' | 'somewhat' | 'no'
⋮----
// "How it works" — open by default on first visit, collapsed thereafter
⋮----
// Load profile + run history on mount
⋮----
async function load()
⋮----
// Fetch courses for matched faculty, in match rank order
⋮----
// Group and preserve match rank order
⋮----
// Load messages cycling animation while running
⋮----
async function handleMatch()
⋮----
// Reload run list and show fresh results
⋮----
// User cancelled — silently restore previous state, no error shown
⋮----
function handleCancelMatch()
⋮----
async function handleUsefulFeedback(response)
⋮----
async function handleSelectRun(runId)
⋮----
async function handleUnmatch(matchId)
⋮----
setMatches(prev => prev.filter(m => m.id !== matchId))  // optimistic
⋮----
// Map faculty_id → grouped courses for per-card "Also teaches" context
⋮----
const archivedRuns = runs.slice(1)  // all but the newest
⋮----
// ── Render ─────────────────────────────────────────────────────────────────
⋮----
// ── State: ready (no runs yet) ─────────────────────────────────────────────
⋮----
{/* Hero */}
⋮----
{/* How it works — collapsible, closed after first visit */}
⋮----
{/* Profile completeness nudge */}
⋮----
// ── State: results ─────────────────────────────────────────────────────────
⋮----
{/* Header */}
⋮----
{/* Encouraging summary banner */}
⋮----
{/* Post-match usefulness prompt — shows once after first-ever run */}
⋮----
{/* "Next step" callout */}
⋮----
{/* Profile completeness nudge */}
⋮----
{/* Weak-results tip — all matches exploratory */}
⋮----
{/* Empty state when all matches removed */}
⋮----
{/* Strength filter pills */}
⋮----
{/* Match cards */}
⋮----
{/* Suggested courses from matched faculty */}
⋮----
{/* Archive */}
⋮----
// ── Match card ─────────────────────────────────────────────────────────────────
⋮----
function MatchCard(
⋮----
async function handleReport()
⋮----
{/* Header row */}
⋮----
{/* Avatar */}
⋮----
{/* Name + meta */}
⋮----
{/* Match reasons */}
⋮----
{/* Collaboration ideas */}
⋮----
{/* Teaching context — lightweight course signal */}
⋮----
{/* Footer */}
⋮----
{/* Save button */}
⋮----
{/* Remove match button */}
⋮----
{/* Data quality footer */}
⋮----
// ── Icon components ────────────────────────────────────────────────────────────
````

## File: src/pages/Dashboard.jsx
````javascript
function LaunchChecklist(
⋮----
{/* Status icon */}
⋮----
{/* Label */}
⋮----
{/* CTA for next step */}
⋮----
function randomGreeting()
⋮----
export default function Dashboard()
⋮----
// Load latest match run
⋮----
// Load teaching context: courses from matched faculty, sorted by match rank
⋮----
// Load saved case study ideas
⋮----
// Load email draft count for checklist step 5
⋮----
// Load saved faculty details
⋮----
async function handleUnsave(facultyId)
⋮----
// Optimistic update
⋮----
async function handleUpdateFacultyStatus(facultyId, status)
⋮----
async function handleUnmatchFromDashboard(matchId)
⋮----
setMatches(prev => prev.filter(m => m.id !== matchId))  // optimistic
⋮----
async function handleDeleteSavedIdea(ideaId)
⋮----
setSavedIdeas(prev => prev.filter(i => i.id !== ideaId))  // optimistic
⋮----
{/* Header skeleton */}
⋮----
{/* Section skeletons */}
⋮----
{/* Header */}
⋮----
{/* Launch checklist */}
⋮----
{/* Profile list + action button */}
⋮----
{/* My Matches */}
⋮----
{/* Rank badge */}
⋮----
{/* Avatar */}
⋮----
{/* Name + unit + strength */}
⋮----
{/* Action links */}
⋮----
{/* Teaching context from matched faculty — only shown when matches exist */}
⋮----
{/* Saved Case Study Ideas */}
⋮----
{/* Faculty avatar */}
⋮----
{/* Title + faculty name */}
⋮----
{/* Delete button */}
⋮----
{/* Saved Faculty */}
⋮----
{/* Avatar */}
⋮----
{/* Info — links to detail page */}
⋮----
{/* Status picker */}
⋮----
{/* Unsave button */}
⋮----
function Badge(
````




# Instruction
# ProFound — Codebase Context for AI Review

## What this app is
ProFound is an HBS MBA student tool for finding and connecting with HBS faculty. Students create a profile describing their professional background and interests, run an AI matching engine that ranks all ~276 HBS faculty by relevance, explore case study idea concepts they could co-develop with each matched professor, and draft outreach emails to pitch those ideas. The app is live and in use by HBS MBAs.

## Tech stack
- **Frontend:** React 18 + Vite, Tailwind CSS (custom crimson brand color `#A51C30`)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** Claude API called from Supabase Edge Functions (Deno)
- **Auth:** Supabase Auth — Google OAuth primary, email/password secondary. All routes require login.

## Key pages
- `Landing.jsx` — unauthenticated landing + auth form
- `Dashboard.jsx` — user home; shows profile, matches, saved ideas, saved faculty, launch checklist
- `Matching.jsx` — AI faculty matching engine; runs against all faculty, returns ranked results with reasoning
- `CaseStudyIdeas.jsx` — per-match idea generator; brainstorms HBS teaching cases the student could co-author
- `SavedIdeas.jsx` — library of saved case study ideas; email draft panel per faculty group
- `Faculty.jsx` — searchable/filterable faculty directory
- `FacultyDetail.jsx` — individual faculty profile with research tags, publications, courses
- `ProfileNew.jsx` / `ProfileEdit.jsx` — profile creation/editing with file uploads (resume, LinkedIn PDF)
- `CourseDirectory.jsx` — full HBS course catalog with filters

## Key database tables
- `hbs_ip` — user profiles (professional_interests, resume_text, linkedin_text, uploads)
- `faculty` — all HBS faculty (~276 rows)
- `faculty_matches` — results of each match run (reasons, strength, rank, collaboration_ideas)
- `match_runs` — one row per AI matching run
- `saved_case_ideas` — user-saved case study concepts with teaching_themes, student_angle, faculty_angle
- `case_idea_runs` — tracks idea generation runs for rate limiting
- `email_draft_runs` — tracks email draft generation for rate limiting
- `saved_faculty` — bookmarked faculty with status (interested/researching/top_choice/emailed/not_now)
- `faculty_courses` — course catalog joined to faculty
- `feedback` — general feedback and data issue reports

## Edge functions (Supabase/Deno)
- `generate-matches` — reads user profile + all faculty, calls Claude, returns ranked matches
- `generate-case-ideas` — reads match context + user profile, calls Claude, returns case concepts
- `generate-email-draft` — reads saved ideas + faculty context, calls Claude, drafts outreach email

## Rate limits
- Faculty matching: 3 runs/day
- Case idea generation: 3 runs/day  
- Email drafts: 10/day

## Shared patterns
- `useRequireAuth()` — redirects to `/` if no session
- `useSavedFaculty()` — manages saved/status state across pages
- `invokeEdgeFunction()` — wraps Supabase functions.invoke with error handling
- `groupCourseRows()` — deduplicates team-taught courses into one card per logical offering
- `trackEvent()` — lightweight analytics (no external SDK)
- All edge functions require `--no-verify-jwt` header (set in Supabase dashboard)
