-- Add topics_to_explore field for lightweight profile supplementation
-- Used as additional matching context alongside resume_text and professional_interests
ALTER TABLE hbs_ip ADD COLUMN IF NOT EXISTS topics_to_explore text;
