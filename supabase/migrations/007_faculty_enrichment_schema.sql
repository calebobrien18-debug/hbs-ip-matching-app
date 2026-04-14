-- Research keyword tags scraped from HBS faculty profile pages
create table if not exists faculty_tags (
  id          uuid        default gen_random_uuid() primary key,
  faculty_id  uuid        not null references faculty(id) on delete cascade,
  tag         text        not null,
  source      text        default 'hbs',
  created_at  timestamptz default now(),
  unique (faculty_id, tag)
);

alter table faculty_tags enable row level security;

create policy "Authenticated users can read faculty_tags"
  on faculty_tags for select
  to authenticated
  using (true);

create index faculty_tags_faculty_id_idx on faculty_tags (faculty_id);


-- Recent publications scraped from HBS faculty profile pages
create table if not exists faculty_publications (
  id          uuid        default gen_random_uuid() primary key,
  faculty_id  uuid        not null references faculty(id) on delete cascade,
  title       text        not null,
  year        integer,
  pub_type    text,       -- 'Journal Article' | 'Book' | 'Case' | 'Working Paper' | 'Chapter'
  journal     text,       -- journal or publisher name
  url         text,       -- link to HBS item page or external DOI
  source      text        default 'hbs',
  created_at  timestamptz default now()
);

alter table faculty_publications enable row level security;

create policy "Authenticated users can read faculty_publications"
  on faculty_publications for select
  to authenticated
  using (true);

create index faculty_publications_faculty_id_idx on faculty_publications (faculty_id);
create index faculty_publications_year_idx       on faculty_publications (year desc);
