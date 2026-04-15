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
