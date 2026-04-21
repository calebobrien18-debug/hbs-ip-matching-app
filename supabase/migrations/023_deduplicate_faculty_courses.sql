-- Migration 023: Deduplicate faculty_courses and add unique constraint
-- ---------------------------------------------------------------------------
-- Keeps the row with the SHORTEST description for each (faculty_id, course_title)
-- pair, then enforces that uniqueness at the DB level.
-- Apply manually via Supabase SQL Editor.

-- Step 1: Normalize whitespace so "Course A" and " Course A" are treated the same
UPDATE faculty_courses
SET course_title = TRIM(course_title)
WHERE course_title IS DISTINCT FROM TRIM(course_title);

-- Step 2: Delete duplicates for non-null faculty_id, keeping shortest description
DELETE FROM faculty_courses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY faculty_id, course_title
        ORDER BY COALESCE(LENGTH(description), 0) ASC, id ASC
      ) AS rn
    FROM faculty_courses
    WHERE faculty_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Unique constraint — one row per (faculty_id, course_title)
ALTER TABLE faculty_courses
  ADD CONSTRAINT faculty_courses_faculty_id_course_title_key
  UNIQUE (faculty_id, course_title);
