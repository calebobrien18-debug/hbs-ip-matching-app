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
