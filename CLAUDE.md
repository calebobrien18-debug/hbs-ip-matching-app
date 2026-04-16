# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## Project Overview

**ProFound** — A React + Supabase web app that matches Harvard Business School doctoral students with faculty based on shared research interests. Students create a profile, browse faculty, run an AI-powered matching tool, generate case study ideas with matched faculty, and save ideas for later.

**Stack:** Vite + React, Tailwind v4 (with `@theme` in `src/index.css`, no `tailwind.config.js`), Supabase (auth, DB, storage, Edge Functions), Claude Sonnet via Anthropic API (Edge Functions), GitHub OAuth.

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

## Environment

Credentials live in `.env` (gitignored). Required variables:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## Database Schema (17 migrations applied locally)

> **Note:** Migrations are applied manually via Supabase SQL Editor (not via CLI), since the project is not linked to a remote Supabase project via CLI.

| Table | Purpose |
|---|---|
| `hbs_ip` | Student profiles — name, program, advisor, research interests, background, PDF text |
| `faculty` | ~303 HBS faculty — name, title, bio, image_url, tags[], publications[], courses[] |
| `saved_faculty` | Student bookmarks of faculty |
| `match_runs` | Each time matching is triggered (user_id, created_at) — used for rate limiting |
| `faculty_matches` | Results of a match run — match_id, run_id, faculty_id, score, rationale |
| `case_idea_runs` | Rate-limit log for idea generation (user_id, match_id, created_at) |
| `saved_case_ideas` | Persisted case study ideas — user_id, match_id, faculty_id, title, premise, protagonist, teaching_themes[], student_angle, faculty_angle |
| `feedback` | User feedback submissions — user_id, message (no email stored) |

**RLS is enabled on all tables.** Key policies:
- `faculty_matches`: DELETE allowed for match owner (used for unmatch feature)
- `saved_case_ideas`: SELECT/INSERT/DELETE by owner
- `feedback`: INSERT only for authenticated users; no SELECT (service role reads only)

**Supabase Edge Functions** (in `supabase/functions/`):
- `match-faculty` — calls Claude Sonnet to score/rank faculty against student profile; inserts into `match_runs` + `faculty_matches`; capped at 6 matches per run
- `generate-case-ideas` — calls Claude Sonnet to generate 3 case study ideas for a student+faculty pair; rate-limited to 1 run per match per day via `case_idea_runs`

---

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `Landing.jsx` | Public — ProFound logo (`<img src="/profound-logo.svg">`), tagline, GitHub sign-in, crimson gradient, copyright footer |
| `/auth/callback` | `AuthCallback.jsx` | GitHub OAuth callback handler |
| `/dashboard` | `Dashboard.jsx` | My Profile summary, My Matches (with unmatch), Saved Case Study Ideas, Saved Faculty |
| `/profile/new` | `ProfileNew.jsx` | Create student profile |
| `/profile/edit` | `ProfileEdit.jsx` | Edit student profile |
| `/profile/:id` | `ProfileDetail.jsx` | View any student profile |
| `/faculty` | `Faculty.jsx` | Browse all ~303 HBS faculty — research topic multi-select filter, sort, bookmark |
| `/faculty/:id` | `FacultyDetail.jsx` | Faculty detail — bio, publications, courses, tags |
| `/match` | `Matching.jsx` | AI matching — run match, view results with rationale, filter by interest, indigo "Case Study Ideas" CTA, unmatch per card |
| `/case-ideas/:matchId` | `CaseStudyIdeas.jsx` | Generate and save case study ideas for a specific faculty match |

All authenticated routes are wrapped in `<Layout>` in `main.jsx`, which appends `<Footer showFeedback={true} />`.

---

## Components

| File | Description |
|---|---|
| `NavBar.jsx` | White bg (`bg-white border-b border-gray-200`), `ProFoundLogo size="sm"`, nav links (gray/crimson active), user greeting, sign out. No "Harvard Business School" text. |
| `ProFoundLogo.jsx` | Inline-flex logo: "Pr" (charcoal bold system-ui) + SVG magnifying glass + "Found" (crimson). Three sizes: sm/md/lg. See logo notes below. |
| `ProfFoundLogo.jsx` | Old fedora hat logo — unused, kept for reference only |
| `Footer.jsx` | `showFeedback={false}` → copyright only. `showFeedback={true}` → adds "Share feedback" button that opens `FeedbackModal` (submits to `feedback` table, no email exposed) |
| `Layout.jsx` | Simple React fragment: `<>{children}<Footer showFeedback={true} /></>` |

---

## Logo Details

**`ProFoundLogo.jsx` (on-screen rendering):**
- `display: inline-flex`, `alignItems: flex-end`
- SVG: `marginBottom: '0.083em'` (= F/12 for system-ui on Windows, verified via canvas `fontBoundingBoxAscent/Descent` — places circle bottom precisely on text baseline)
- Circle: `cx=9 cy=12 r=8` in 20×20 viewBox → bottom at y=20 = SVG element bottom = text baseline
- Network nodes: equilateral triangle at radius 5 from center — top (9,7), lower-left (4.7,14.5), lower-right (13.3,14.5)
- Handle: (15.4,18.4)→(22,25), `overflow:visible`
- Sizes: sm (1.05rem, iconSize 11px), md (1.5rem, 16px), lg (4.5rem, 47px)

**`public/profound-logo.svg` (right-click saveable):**
- Pure SVG at 80px font-size, viewBox `0 0 380 116`
- Text widths calibrated to Windows/Segoe UI via canvas `measureText`: "Pr" 77.76px, icon 52px, "Found" 228.8px, baseline y=94
- Landing page hero uses `<img src="/profound-logo.svg" style={{ height:'6.5rem' }}>` to enable right-click → "Save image as"
- On non-Windows systems, text spacing may shift slightly (text not outlined)

**Brand colors** (defined in `src/index.css` via `@theme`):
- `--color-crimson: #A51C30` → use as `text-crimson`, `bg-crimson`, `hover:bg-crimson-dark`
- `--color-crimson-dark: #8B1628`

---

## Security Rules (non-negotiable)

- **RLS on every table** — Enable Row Level Security on every new table, no exceptions.
- **Session checks on every protected page** — Every route that requires authentication must verify an active Supabase session before rendering.
- **No cross-user data exposure** — RLS policies must ensure users can only read/write their own data.
- **Env vars for all secrets** — No keys, tokens, or credentials in source code.

---

## Pending / Future Work

- **Push to remote** — All commits are local only; run `git push origin main` when ready to deploy
- **Feedback review UI** — Admin interface to read `feedback` table (currently only readable via Supabase Table Editor with service role)
- **Logo portability** — `profound-logo.svg` uses live system fonts (not outlined paths); use Inkscape/Figma to convert text to paths for a truly portable file
- **Matching quality** — Scoring/rationale is Claude-generated; prompt lives in `supabase/functions/match-faculty/index.ts`
