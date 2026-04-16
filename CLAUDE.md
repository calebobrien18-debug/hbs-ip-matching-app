# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## Project Overview

**ProFound** — A React + Supabase web app that matches Harvard Business School doctoral students with faculty based on shared research interests. Students create a profile (with resume/LinkedIn PDF upload), browse faculty, run an AI-powered matching tool, generate case study ideas with matched faculty, and save ideas for later.

**Stack:** Vite + React, Tailwind v4 (with `@theme` in `src/index.css`, no `tailwind.config.js`), Supabase (auth, DB, storage, Edge Functions), Claude `claude-sonnet-4-5` via Anthropic API (Edge Functions), GitHub OAuth.

**Dev server:** `npm run dev` → `localhost:5173`  
**Branch:** `main` (all commits local only — never pushed to remote)

---

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (localhost:5173)
npm run build        # production build
npm run lint         # lint
```

---

## Environment

**Client-side** credentials live in `.env` (gitignored):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

**Supabase Edge Function secrets** (set in Supabase Dashboard → Edge Functions → Secrets — NOT in `.env`):

```
ANTHROPIC_API_KEY=        # Required by both generate-matches and generate-case-ideas
```

Without `ANTHROPIC_API_KEY` set as an Edge Function secret, matching and case idea generation will fail with a 500 error.

---

## Key Source Files

| File | Description |
|---|---|
| `src/lib/supabase.js` | Supabase client singleton — import from here everywhere |
| `src/lib/hooks.js` | Two shared hooks: `useRequireAuth()` (redirects unauthenticated users, returns session) and `useSavedFaculty(session)` (loads/toggles saved faculty with optimistic updates) |
| `src/lib/utils.js` | `initials(name)` (1-2 uppercase initials) and `lastName(name)` (for alphabetical sort) |
| `src/lib/pdf.js` | `extractPdfText(file)` — client-side PDF text extraction via `pdfjs-dist`, capped at 15,000 chars (~5-6 pages). Called during profile create/edit when a PDF is uploaded. |
| `src/index.css` | Tailwind v4 theme (`@theme` block with brand colors) |
| `supabase/functions/generate-matches/index.ts` | Matching Edge Function + Claude prompt (see details below) |
| `supabase/functions/generate-case-ideas/index.ts` | Case ideas Edge Function + Claude prompt (see details below) |
| `public/profound-logo.svg` | Standalone saveable logo — `<img>` tag on landing page enables right-click → "Save image as" |
| `public/favicon.svg` | Site favicon |
| `public/icons.svg` | SVG icon sprite (if used) |
| `index.html` | Contains Google Fonts preconnect for Playfair Display — now unused (logo and landing are both sans-serif); safe to remove |

> **Note:** There is no `src/hooks/useAuth.js`. The hooks file is `src/lib/hooks.js`.

---

## Database Schema (17 migrations applied locally)

> **Note:** Migrations are applied manually via Supabase SQL Editor (not via CLI), since the project is not linked to a remote Supabase project via CLI.

### Tables

| Table | Purpose |
|---|---|
| `hbs_ip` | **Student profiles** (non-obvious name) — see full field list below |
| `faculty` | ~303 HBS faculty — core identity fields only (tags/publications/courses are in separate tables) |
| `faculty_tags` | Research keyword tags per faculty (`faculty_id`, `tag`, `source`) |
| `faculty_publications` | Publications per faculty (`faculty_id`, `title`, `year`, `pub_type`, `journal`, `url`) |
| `faculty_courses` | Courses taught per faculty (`faculty_id`, `course_title`, `description`, `unit`, `term`, `quarter`, `credits`) |
| `saved_faculty` | Student bookmarks of faculty — one row per (user_id, faculty_id) pair |
| `match_runs` | One row per AI matching run (`user_id`, `created_at`) — rate-limiting anchor |
| `faculty_matches` | Individual faculty results within a run — see field list below. **The `id` here is what the app calls "matchId"** (used in `/case-ideas/:matchId` route and throughout) |
| `case_idea_runs` | Rate-limit log for idea generation — `user_id`, `match_id`, `created_at` |
| `saved_case_ideas` | Persisted case study ideas — see field list below |
| `feedback` | User feedback — `user_id`, `message` (no email stored) |

### `hbs_ip` fields (built up across migrations 001, 003, 004, 014)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users (unique — one profile per user) |
| `first_name` | text | not null |
| `last_name` | text | not null |
| `email` | text | not null, unique, validated |
| `graduation_year` | integer | not null, 2026–current+10 |
| `hbs_section` | text | A–J |
| `resume_path` | text | Storage path e.g. `{user_id}/resume.pdf` |
| `linkedin_pdf_path` | text | Storage path e.g. `{user_id}/linkedin.pdf` |
| `professional_interests` | text | Free-text interests/goals — **primary matching input** |
| `linkedin_url` | text | Public LinkedIn URL |
| `program` | text | 'MBA' / 'Executive Education' / 'Other' |
| `program_other` | text | Free-text when program = 'Other' |
| `faculty_in_mind` | text | Optional faculty names the student already has in mind — used in keyword scoring |
| `website_urls` | text | Personal websites (newline-separated) |
| `additional_background` | text | Background not captured in resume or LinkedIn — **secondary matching input** |
| `resume_text` | text | Client-side extracted text from resume PDF — **matching input** |
| `linkedin_text` | text | Client-side extracted text from LinkedIn PDF — **matching input** |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

> The `generate-matches` Edge Function sends `professional_interests`, `additional_background`, `faculty_in_mind`, `resume_text`, and `linkedin_text` to Claude.

### `faculty` columns

`id`, `hbs_fac_id` (unique HBS URL ID), `name`, `title` (named professorship/rank), `unit` (HBS academic unit), `email`, `bio`, `profile_url`, `image_url`, `created_at`

Tags, publications, and courses are in **separate tables** (`faculty_tags`, `faculty_publications`, `faculty_courses`) — not columns on `faculty`.

### `faculty_matches` columns

`id`, `run_id` (→ match_runs), `faculty_id` (→ faculty), `rank` (integer, 1 = strongest), `match_strength` ('strong' / 'good' / 'exploratory'), `match_reasons` (text[]), `collaboration_ideas` (text[]), `created_at`

> There are no `score` or `rationale` columns — those are older names no longer in use.

### `saved_case_ideas` columns

`id`, `user_id`, `match_id` (→ faculty_matches **ON DELETE CASCADE**), `faculty_id` (denormalized → faculty **ON DELETE CASCADE**), `title`, `premise`, `protagonist`, `teaching_themes` (text[]), `student_angle`, `faculty_angle`, `created_at`

### Cascade behavior

`saved_case_ideas.match_id` references `faculty_matches.id ON DELETE CASCADE` — unmatching a faculty member automatically deletes all their saved case study ideas server-side.

### RLS

RLS is enabled on every table. Key policies:
- `hbs_ip`: SELECT/INSERT/UPDATE/DELETE by owner only
- `faculty`, `faculty_tags`, `faculty_publications`, `faculty_courses`: SELECT by any authenticated user (read-only)
- `saved_faculty`: SELECT/INSERT/DELETE by owner
- `match_runs`: SELECT/INSERT by owner
- `faculty_matches`: SELECT/INSERT by owner; DELETE by owner (powers unmatch feature)
- `saved_case_ideas`: SELECT/INSERT/DELETE by owner
- `case_idea_runs`: SELECT/INSERT by owner
- `feedback`: INSERT only for authenticated users; no SELECT for regular users (service role reads)
- `storage.objects` (student-files bucket): INSERT/SELECT/UPDATE/DELETE scoped to `{user_id}/%`

### Rate limits

- **Matching:** 3 runs per user per UTC calendar day (enforced in `generate-matches` Edge Function via `DAILY_LIMIT = 3`; client-side also reads `match_runs` to show remaining count)
- **Case ideas:** 3 generations per user per UTC calendar day (enforced in `generate-case-ideas` Edge Function via `DAILY_LIMIT = 3`, tracked by `user_id` in `case_idea_runs`)

### Storage

One bucket — `student-files` (private, not public). Files stored at:
- `{user_id}/resume.pdf`
- `{user_id}/linkedin.pdf`

Text is extracted client-side via `src/lib/pdf.js` before upload and saved to `resume_text` / `linkedin_text`.

### RPC functions (migration 011)

- `get_research_tags()` → `{tag, faculty_count}[]` — returns all tags sorted by faculty count. Used to populate the topic filter pills on `/faculty`.
- `get_faculty_by_tag(tag_name text)` → `{faculty_id}[]` — returns faculty IDs by tag (server-side filtering fallback).

---

## Edge Functions

Both functions use native `fetch` to call the Anthropic API (no SDK import) and use `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase runtime, not in `.env`).

### `generate-matches` (`supabase/functions/generate-matches/index.ts`)

1. Verify JWT → resolve user_id
2. Check rate limit: 3 runs per UTC day via `match_runs`
3. Load student profile from `hbs_ip`
4. Load all faculty with tags, publications, courses
5. **Keyword scoring** — tokenizes student text, scores all ~303 faculty, selects top 20 candidates
6. Call Claude `claude-sonnet-4-5` with student profile + top 20 faculty summaries → returns JSON array of 2–6 matches with `faculty_id`, `rank`, `match_strength`, `match_reasons[]`, `collaboration_ideas[]`
7. Insert into `match_runs` + `faculty_matches`
8. Return `{ run_id, matches }` (enriched with faculty data)

### `generate-case-ideas` (`supabase/functions/generate-case-ideas/index.ts`)

1. Verify JWT → resolve user_id
2. Parse body: `{ match_id, user_context }` (user_context is optional steering text, max 1000 chars)
3. Check rate limit: 3 per user per UTC day via `case_idea_runs`
4. Load `faculty_matches` row + verify ownership via `match_runs.user_id`
5. Load faculty tags/publications/courses + student profile in parallel
6. Insert `case_idea_runs` row (counts attempt before calling Claude)
7. Call Claude `claude-sonnet-4-5` → returns JSON array of 2–4 case study ideas with `title`, `premise`, `protagonist`, `teaching_themes[]`, `student_angle`, `faculty_angle`
8. Return `{ ideas, runsToday }`

---

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `Landing.jsx` | Public — ProFound logo (`<img src="/profound-logo.svg">`), tagline, GitHub sign-in, crimson gradient, copyright-only footer |
| `/auth/callback` | `AuthCallback.jsx` | GitHub OAuth callback handler |
| `/dashboard` | `Dashboard.jsx` | Four sections: Your Profile, My Matches (with unmatch), Saved Case Study Ideas, My Saved Faculty |
| `/profile/new` | `ProfileNew.jsx` | Create student profile — all `hbs_ip` fields + resume/LinkedIn PDF upload |
| `/profile/edit` | `ProfileEdit.jsx` | Edit student profile |
| `/profile/:id` | `ProfileDetail.jsx` | View any student profile |
| `/faculty` | `Faculty.jsx` | Browse all ~303 HBS faculty — research topic multi-select filter (via `get_research_tags()` RPC), sort, bookmark |
| `/faculty/:id` | `FacultyDetail.jsx` | Faculty detail — bio, publications, courses, tags |
| `/match` | `Matching.jsx` | AI matching — run match (3/day limit), view results with match strength filter, archive of past runs, bookmark faculty, generate case ideas CTA, unmatch per card |
| `/case-ideas/:matchId` | `CaseStudyIdeas.jsx` | Generate and save case study ideas for a specific faculty match |

All authenticated routes are wrapped in `<Layout>` in `main.jsx`, which appends `<Footer showFeedback={true} />`.

---

## Components

| File | Description |
|---|---|
| `NavBar.jsx` | Sticky, white bg (`bg-white border-b border-gray-200`), `ProFoundLogo size="sm"`, nav links (Dashboard / Faculty / Matching / My Profile), user greeting (from `hbs_ip.first_name`, falls back to GitHub metadata), sign out. No "Harvard Business School" text. |
| `ProFoundLogo.jsx` | Inline-flex logo: "Pr" (charcoal bold system-ui) + SVG magnifying glass + "Found" (crimson). Three sizes: sm/md/lg. See logo details below. |
| `ProfFoundLogo.jsx` | Old fedora hat logo — **unused**, kept for reference only |
| `Footer.jsx` | `showFeedback={false}` → copyright only (`© 2026 ProFound, LLC. All rights reserved.`). `showFeedback={true}` → adds "Share feedback" button that opens `FeedbackModal` (submits to `feedback` table, no email stored) |
| `Layout.jsx` | React **fragment** only: `<>{children}<Footer showFeedback={true} /></>` — **must stay a fragment**. Authenticated pages already have `min-h-screen` internally; wrapping in a flex column would push the footer below the fold. |

---

## Logo Details

**`ProFoundLogo.jsx` (on-screen rendering):**
- Outer `<span>`: `display: inline-flex`, `alignItems: flex-end` — all children bottom-align
- SVG: `marginBottom: '0.083em'` (= F/12 for system-ui on Windows, derived from `canvas.fontBoundingBoxAscent/Descent` — places circle bottom precisely on text baseline)
- Circle: `cx=9 cy=12 r=8` in 20×20 viewBox → bottom at y=20 = SVG element bottom = text baseline
- Network nodes: equilateral triangle at radius 5 from center — top (9,7), lower-left (4.7,14.5), lower-right (13.3,14.5)
- Handle: (15.4,18.4)→(22,25), `overflow:visible`
- Lens fill: `rgba(165,28,48,0.06)` subtle crimson tint
- Sizes: sm (1.05rem, iconSize 11px), md (1.5rem, 16px), lg (4.5rem, 47px)
- Typography set on outer span so `em` units in marginBottom resolve against the logo's own font-size

**`public/profound-logo.svg` (right-click saveable):**
- Pure SVG at 80px font-size, viewBox `0 0 380 116`
- Text widths calibrated to Windows/Segoe UI via canvas `measureText`: "Pr" 77.76px, icon 52px (scale 2.6), "Found" 228.8px, baseline y=94
- Landing page hero: `<img src="/profound-logo.svg" style={{ height:'6.5rem' }}>` — `<img>` tag (not the React component) enables right-click → "Save image as"
- Text is not outlined — spacing may shift slightly on non-Windows systems

**Brand colors** (defined in `src/index.css` via `@theme`):
- `--color-crimson: #A51C30` → use as `text-crimson`, `bg-crimson`, `hover:bg-crimson-dark`
- `--color-crimson-dark: #8B1628`

---

## Security Rules (non-negotiable)

- **RLS on every table** — Enable Row Level Security on every new table, no exceptions.
- **Session checks on every protected page** — Every route that requires authentication must call `useRequireAuth()` from `src/lib/hooks.js` before rendering.
- **No cross-user data exposure** — RLS policies must ensure users can only read/write their own data.
- **Env vars for all secrets** — No keys, tokens, or credentials in source code. `ANTHROPIC_API_KEY` goes in Supabase Edge Function secrets, not `.env`.

---

## Pending / Future Work

- **Push to remote** — All commits are local only; run `git push origin main` when ready to deploy
- **Feedback review UI** — Admin interface to read `feedback` table (currently only readable via Supabase Table Editor with service role)
- **Logo portability** — `profound-logo.svg` uses live system fonts (not outlined paths); use Inkscape/Figma to convert text to paths for a truly portable file
- **Matching quality** — Prompt lives in `supabase/functions/generate-matches/index.ts`; keyword scoring stopword list is in the same file
- **Playfair Display** — Google Fonts preconnect in `index.html` is unused (logo and landing are both sans-serif); safe to remove
