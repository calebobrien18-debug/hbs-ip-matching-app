-- Fix faculty titles where HBS scraping concatenated multiple role strings
-- without any separator (e.g. "...AdministrationPeter O. Crisp...").
-- Inserts ". " wherever a lowercase letter runs directly into an uppercase
-- letter — the same rule used by formatFacultyTitle() on the frontend.
-- The WHERE clause limits writes to the ~handful of rows that actually match.

update faculty
set    title = regexp_replace(title, '([a-z])([A-Z])', E'\\1. \\2', 'g')
where  title ~ '[a-z][A-Z]';
