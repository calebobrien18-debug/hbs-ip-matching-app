-- ── Research tags filter function ────────────────────────────────────────────
--
-- Returns every tag in use, sorted by how many faculty carry it.
-- Called by the Faculty browse page to populate the Topic filter pills and
-- by any future filtering UI that needs the canonical tag list.
--
-- Usage (from the app):
--   const { data } = await supabase.rpc('get_research_tags')
--   // → [{ tag: 'Corporate Governance', faculty_count: 28 }, ...]
--
-- Usage (SQL):
--   SELECT * FROM get_research_tags() WHERE faculty_count >= 3;

create or replace function get_research_tags()
returns table(tag text, faculty_count bigint)
language sql
security definer
stable
as $$
  select
    ft.tag,
    count(distinct ft.faculty_id) as faculty_count
  from faculty_tags ft
  group by ft.tag
  order by faculty_count desc, ft.tag
$$;

-- Grant read access to authenticated users (matches RLS on faculty_tags)
grant execute on function get_research_tags() to authenticated;


-- ── Faculty search by tag ─────────────────────────────────────────────────────
--
-- Returns all faculty IDs that carry a given tag.
-- Useful for server-side filtering if the client-side approach becomes too slow.
--
-- Usage (from the app):
--   const { data } = await supabase.rpc('get_faculty_by_tag', { tag_name: 'ESG Investing' })
--   // → [{ faculty_id: '...' }, ...]

create or replace function get_faculty_by_tag(tag_name text)
returns table(faculty_id uuid)
language sql
security definer
stable
as $$
  select distinct ft.faculty_id
  from faculty_tags ft
  where lower(ft.tag) = lower(tag_name)
$$;

grant execute on function get_faculty_by_tag(text) to authenticated;
