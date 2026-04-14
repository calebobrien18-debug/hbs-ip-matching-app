-- Remove low-quality tags inserted by the initial scraper run.
-- These were nav links / sidebar text, not actual research areas.
delete from faculty_tags
where source = 'hbs'
  and tag in (
    'accounting red flags',
    'MBA Alumni Research Survey Information',
    'entrepreneurship'
  );
