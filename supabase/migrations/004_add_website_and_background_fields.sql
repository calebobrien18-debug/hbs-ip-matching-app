-- ============================================================
-- 004_add_website_and_background_fields.sql
-- ============================================================

alter table hbs_ip
  add column website_urls          text, -- personal websites / portfolios (newline-separated)
  add column additional_background text; -- background not captured on resume or LinkedIn
