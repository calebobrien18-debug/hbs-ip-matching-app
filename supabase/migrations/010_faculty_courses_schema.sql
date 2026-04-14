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
