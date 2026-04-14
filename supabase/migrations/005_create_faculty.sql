-- Faculty directory table
create table if not exists faculty (
  id            uuid        default gen_random_uuid() primary key,
  hbs_fac_id    text        unique not null,           -- facId from HBS profile URL
  name          text        not null,
  title         text,                                  -- named professorship / rank
  unit          text,                                  -- HBS academic unit
  email         text,
  bio           text,
  profile_url   text,
  image_url     text,
  created_at    timestamptz default now()
);

-- Full-text search index over name, unit, and bio
create index faculty_name_idx on faculty using gin(to_tsvector('english', name));
create index faculty_bio_idx  on faculty using gin(to_tsvector('english', coalesce(bio, '')));
create index faculty_unit_idx on faculty (unit);

-- RLS: authenticated users can browse the faculty directory (read-only)
alter table faculty enable row level security;

create policy "Authenticated users can read faculty"
  on faculty for select
  to authenticated
  using (true);
