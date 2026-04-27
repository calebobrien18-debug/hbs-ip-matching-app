# ProFound

ProFound helps HBS MBA candidates identify faculty research partners, develop HBS teaching case concepts, and draft targeted outreach emails — all from a single profile.

## Who it's for

Second-year HBS MBA candidates (EC year) who want to co-develop field-based independent projects or teaching cases with HBS faculty.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS |
| Backend | Supabase (Postgres + RLS + Auth + Storage) |
| Edge functions | Deno (TypeScript), deployed to Supabase |
| AI | Anthropic Claude Sonnet via direct API (no SDK) |
| Auth | Supabase Auth (Google OAuth) |

## Local setup

```bash
npm install
cp .env.example .env   # fill in values — see Environment below
npm run dev            # starts Vite dev server on http://localhost:5173
```

## Environment variables

Required in `.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Required in Supabase edge function secrets (set via `supabase secrets set`):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Architecture

```
src/
  pages/          React page components (Dashboard, Matching, Faculty, CourseMatch, etc.)
  components/     Shared UI (NavBar, Footer, Icons, Layout)
  lib/            Supabase client, hooks, utils, constants, analytics

supabase/
  functions/      Edge functions (Deno)
    generate-matches/         Faculty matching via Claude
    generate-course-matches/  Course matching via Claude
    generate-case-ideas/      Case study concept generation
    generate-email-draft/     Outreach email drafting
    _shared/                  Shared helpers (CORS, auth, Claude call wrapper)
  migrations/     Numbered SQL migrations (apply manually via Supabase SQL editor)
```

### Key data flow

1. User creates a profile (`hbs_ip` table) with interests, background, resume/LinkedIn text
2. `generate-matches` edge function scores all faculty by keyword overlap, passes top 20 to Claude, writes results to `match_runs` + `faculty_matches`
3. User saves faculty to `saved_faculty` (with status tracking), generates case ideas via `generate-case-ideas`, drafts emails via `generate-email-draft`
4. `generate-course-matches` similarly matches against the 2026–27 HBS elective catalog (`faculty_courses` with `source = 'hbs_catalog_2026'`)

### Rate limits

| Action | Daily limit |
|---|---|
| Faculty match runs | 3 / user / UTC day |
| Course match runs | 5 / user / UTC day |
| Email draft runs | 10 / user / UTC day |
| Case idea generations | 3 / user / UTC day |

Rate limiting is enforced in edge functions: a run row is inserted first, then the count is verified. If over limit, the row is deleted and a 429 is returned. See comments in `generate-matches/index.ts` for the planned fully-atomic follow-up.

## Important deployment notes

- **Edge functions**: JWT verification is handled manually in `_shared/mod.ts`. Do not pass `--no-verify-jwt` when deploying.
- **Migrations are applied manually** via the Supabase SQL editor — there is no automated migration runner. Apply files in numerical order.
- **Course catalog data** is seeded via `scripts/seed-courses.js` using `source = 'hbs_catalog_2026'`. Clear existing rows before reseeding (clear both sources pattern — see project memory).
- **RLS policies**: every writable table needs both INSERT and UPDATE policies for authenticated users. Migration 028 shows the pattern for a missed UPDATE policy.
- **Supabase query limit**: default page size is 100 rows. Use `.limit()` or `.range()` explicitly for tables that may exceed this (faculty, faculty_courses).
