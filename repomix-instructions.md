# ProFound — Codebase Context for AI Review

## What this app is
ProFound is an HBS MBA student tool for finding and connecting with HBS faculty. Students create a profile describing their professional background and interests, run an AI matching engine that ranks all ~276 HBS faculty by relevance, explore case study idea concepts they could co-develop with each matched professor, and draft outreach emails to pitch those ideas. The app is live and in use by HBS MBAs.

## Tech stack
- **Frontend:** React 18 + Vite, Tailwind CSS (custom crimson brand color `#A51C30`)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** Claude API called from Supabase Edge Functions (Deno)
- **Auth:** Supabase Auth — Google OAuth primary, email/password secondary. All routes require login.

## Key pages
- `Landing.jsx` — unauthenticated landing + auth form
- `Dashboard.jsx` — user home; shows profile, matches, saved ideas, saved faculty, launch checklist
- `Matching.jsx` — AI faculty matching engine; runs against all faculty, returns ranked results with reasoning
- `CaseStudyIdeas.jsx` — per-match idea generator; brainstorms HBS teaching cases the student could co-author
- `SavedIdeas.jsx` — library of saved case study ideas; email draft panel per faculty group
- `Faculty.jsx` — searchable/filterable faculty directory
- `FacultyDetail.jsx` — individual faculty profile with research tags, publications, courses
- `ProfileNew.jsx` / `ProfileEdit.jsx` — profile creation/editing with file uploads (resume, LinkedIn PDF)
- `CourseDirectory.jsx` — full HBS course catalog with filters

## Key database tables
- `hbs_ip` — user profiles (professional_interests, resume_text, linkedin_text, uploads)
- `faculty` — all HBS faculty (~276 rows)
- `faculty_matches` — results of each match run (reasons, strength, rank, collaboration_ideas)
- `match_runs` — one row per AI matching run
- `saved_case_ideas` — user-saved case study concepts with teaching_themes, student_angle, faculty_angle
- `case_idea_runs` — tracks idea generation runs for rate limiting
- `email_draft_runs` — tracks email draft generation for rate limiting
- `saved_faculty` — bookmarked faculty with status (interested/researching/top_choice/emailed/not_now)
- `faculty_courses` — course catalog joined to faculty
- `feedback` — general feedback and data issue reports

## Edge functions (Supabase/Deno)
- `generate-matches` — reads user profile + all faculty, calls Claude, returns ranked matches
- `generate-case-ideas` — reads match context + user profile, calls Claude, returns case concepts
- `generate-email-draft` — reads saved ideas + faculty context, calls Claude, drafts outreach email

## Rate limits
- Faculty matching: 3 runs/day
- Case idea generation: 3 runs/day  
- Email drafts: 10/day

## Shared patterns
- `useRequireAuth()` — redirects to `/` if no session
- `useSavedFaculty()` — manages saved/status state across pages
- `invokeEdgeFunction()` — wraps Supabase functions.invoke with error handling
- `groupCourseRows()` — deduplicates team-taught courses into one card per logical offering
- `trackEvent()` — lightweight analytics (no external SDK)
- All edge functions require `--no-verify-jwt` header (set in Supabase dashboard)
