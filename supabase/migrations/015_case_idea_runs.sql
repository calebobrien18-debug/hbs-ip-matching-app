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
