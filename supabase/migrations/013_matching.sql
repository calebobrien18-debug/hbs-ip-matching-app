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
