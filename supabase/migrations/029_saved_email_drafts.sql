-- Persisted email drafts generated from the outreach flow.
-- Each row stores a single saved draft tied to a faculty member plus the
-- case-idea IDs that were included when the draft was generated.
-- idea_ids is advisory (UUIDs of saved_case_ideas rows); no FK so deleting an
-- idea doesn't cascade-delete the draft that referenced it.

create table saved_email_drafts (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  faculty_id   uuid        not null references faculty(id) on delete cascade,
  idea_ids     uuid[]      not null default '{}',
  subject      text        not null default '',
  body         text        not null,
  tone         text        not null default 'warm'
                           check (tone in ('formal', 'warm', 'concise')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table saved_email_drafts enable row level security;

create policy "Users can read own drafts"
  on saved_email_drafts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own drafts"
  on saved_email_drafts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own drafts"
  on saved_email_drafts for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own drafts"
  on saved_email_drafts for delete
  to authenticated
  using (auth.uid() = user_id);

create index saved_email_drafts_user_id_idx    on saved_email_drafts (user_id);
create index saved_email_drafts_faculty_id_idx on saved_email_drafts (faculty_id);
