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
