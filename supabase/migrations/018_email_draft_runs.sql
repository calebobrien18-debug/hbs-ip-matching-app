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
