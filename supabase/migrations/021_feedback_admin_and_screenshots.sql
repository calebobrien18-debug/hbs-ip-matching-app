-- Add screenshot_url and user_email columns to feedback
alter table feedback add column screenshot_url text;
alter table feedback add column user_email text;

-- ── Admins table ───────────────────────────────────────────────────────────────
create table admins (
  user_id uuid references auth.users(id) on delete cascade primary key
);

alter table admins enable row level security;

-- Any authenticated user can check whether they are in the admins table
create policy "Authenticated users can read admins"
  on admins for select to authenticated using (true);

-- ── Feedback read/update policies for admins ───────────────────────────────────
create policy "Admins can select feedback"
  on feedback for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "Admins can update feedback"
  on feedback for update to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

-- ── Storage bucket for screenshots ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict do nothing;

-- Authenticated users can upload screenshots into their own folder
create policy "Users can upload feedback screenshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all screenshots (to generate signed URLs)
create policy "Admins can read feedback screenshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and exists (select 1 from admins where user_id = auth.uid())
  );
