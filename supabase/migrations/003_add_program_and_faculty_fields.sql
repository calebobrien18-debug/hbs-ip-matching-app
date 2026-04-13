-- ============================================================
-- 003_add_program_and_faculty_fields.sql
-- Adds program enrollment and faculty-in-mind fields to hbs_ip
-- ============================================================

alter table hbs_ip
  add column program       text check (program in ('MBA', 'Executive Education', 'Other')),
  add column program_other text,   -- free-text description when program = 'Other'
  add column faculty_in_mind text; -- optional list of faculty the student already has in mind
