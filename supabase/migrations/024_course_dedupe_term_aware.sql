-- Migration 024: Replace (faculty_id, course_title) unique constraint with a
-- term+quarter-aware version so distinct offerings of the same course across
-- different terms/quarters are stored as separate rows.
--
-- Previously: UNIQUE (faculty_id, course_title)        [migration 023]
-- New:        UNIQUE (faculty_id, course_title, term, quarter)
--
-- Apply manually via Supabase SQL Editor before running seed-courses.js.
-- -----------------------------------------------------------------------

-- Step 1: Remove existing duplicates that differ only by term/quarter.
--         Keep the row with the longest description for each group.
DELETE FROM faculty_courses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY faculty_id, course_title, term, quarter
        ORDER BY COALESCE(LENGTH(description), 0) DESC, id ASC
      ) AS rn
    FROM faculty_courses
    WHERE faculty_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Drop the old (faculty_id, course_title) unique constraint.
ALTER TABLE faculty_courses
  DROP CONSTRAINT IF EXISTS faculty_courses_faculty_id_course_title_key;

-- Step 3: Add the new term+quarter-aware unique constraint.
--         NULL term/quarter values are treated as distinct (NULLS NOT DISTINCT
--         requires PG 15+; omit if your Supabase version is older — the seeder
--         already deduplicates before insert).
ALTER TABLE faculty_courses
  ADD CONSTRAINT faculty_courses_unique_offering
  UNIQUE (faculty_id, course_title, term, quarter);
