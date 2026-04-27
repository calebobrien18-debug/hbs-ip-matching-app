-- Allow authenticated users to update their own saved_faculty rows (e.g. status field)
create policy "Users can update their own saved faculty"
  on saved_faculty for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
