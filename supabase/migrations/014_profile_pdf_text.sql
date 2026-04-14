-- ── PDF text extraction columns ───────────────────────────────────────────────
-- Stores client-side-extracted text from uploaded resume and LinkedIn PDFs.
-- Populated by the profile form when a user uploads a PDF.
-- Used by the generate-matches Edge Function as input to the matching algorithm.

alter table hbs_ip
  add column if not exists resume_text   text,
  add column if not exists linkedin_text text;
