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
