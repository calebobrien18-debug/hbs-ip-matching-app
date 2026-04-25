-- Add status column to saved_faculty for lightweight shortlist workflow
-- Existing owner UPDATE policy on saved_faculty covers this column
ALTER TABLE saved_faculty
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'interested'
  CHECK (status IN ('interested', 'researching', 'top_choice', 'emailed', 'not_now'));
