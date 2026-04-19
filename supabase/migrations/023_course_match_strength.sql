-- Add match_strength to course_matches (mirrors faculty_matches pattern)
alter table course_matches
  add column if not exists match_strength text
  check (match_strength in ('strong', 'good', 'exploratory'));

-- Allow users to delete their own course matches (needed for Remove button)
-- Ownership is established via run_id → course_match_runs.user_id
create policy "Users can delete own course matches"
  on course_matches for delete to authenticated
  using (
    exists (
      select 1 from course_match_runs
      where course_match_runs.id = course_matches.run_id
        and course_match_runs.user_id = auth.uid()
    )
  );
