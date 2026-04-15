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
