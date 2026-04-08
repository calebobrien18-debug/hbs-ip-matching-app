# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A web app for HBS students to discover faculty and pursue research collaborations. It serves two purposes:

1. **Faculty database** — Browse HBS professors by research topics, courses taught, and publications.
2. **Matching platform** — Students upload a resume or LinkedIn profile, get matched to relevant professors, receive AI-generated course/project pitch ideas at the intersection of their interests, and get a drafted outreach email to send to the professor.

## Tech Stack

- **Frontend:** React + Vite
- **Routing:** React Router (client-side)
- **Backend/DB/Auth:** Supabase (PostgreSQL + Auth)
- **OAuth:** GitHub (configured in Supabase)
- **Styling:** Tailwind CSS
- **Migrations:** Supabase CLI (project already linked)

## Environment

Credentials live in `.env` (gitignored). Required variables:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build
npm run lint         # lint
npm run test         # run tests
```

## Database Migrations

All schema changes must be written as SQL migration files and applied via the CLI — never paste SQL into the Supabase dashboard manually.

```bash
# Create a new migration file
npx supabase migration new <migration_name>

# Apply migrations to the linked project
npx supabase db push
```

Migration files live in `supabase/migrations/`.

## Security Rules (non-negotiable)

- **RLS on every table** — Enable Row Level Security on every database table, no exceptions.
- **Session checks on every protected page** — Every route that requires authentication must verify an active Supabase session before rendering any content.
- **No cross-user data exposure** — RLS policies must ensure users can only read/write their own data.
- **Env vars for all secrets** — No keys, tokens, or credentials in source code.
