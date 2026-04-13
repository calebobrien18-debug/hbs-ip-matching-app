-- ============================================================
-- 002_create_student_files_bucket.sql
-- Supabase Storage bucket for student resume and LinkedIn PDF uploads
-- Files are stored at {user_id}/resume.pdf and {user_id}/linkedin.pdf
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', false)
on conflict do nothing;

-- Users can upload files under their own user_id prefix
create policy "Users can upload their own files"
  on storage.objects for insert
  with check (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can read their own files
create policy "Users can read their own files"
  on storage.objects for select
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can overwrite/update their own files
create policy "Users can update their own files"
  on storage.objects for update
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );

-- Users can delete their own files
create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'student-files'
    and name like auth.uid()::text || '/%'
  );
