/**
 * generate-course-matches Edge Function
 * ======================================
 * Matches a student's profile against HBS elective courses and uses Claude
 * to select 2–5 courses with concrete rationale bullets.
 *
 * Mirrors generate-matches closely:
 *   1. Verify JWT → resolve user_id
 *   2. Rate-limit check (course_match_runs, max 3/day)
 *   3. Load user profile from hbs_ip
 *   4. Load all catalog courses from faculty_courses
 *   5. Keyword scoring → top 35 candidates
 *   6. Claude Sonnet selects 2–5 courses with rationale
 *   7. Persist course_match_runs + course_matches rows
 *   8. Return { run_id, matches } with enriched course data
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const DAILY_LIMIT = 3

// ── Stopwords (same set as generate-matches) ──────────────────────────────────
const STOPWORDS = new Set([
  'the','and','for','are','was','were','has','have','had','will','would','could',
  'should','been','being','with','from','this','that','these','those','they',
  'their','them','then','than','also','more','some','such','into','over','when',
  'where','while','which','what','your','about','after','before','between',
  'during','through','other','work','worked','working','years','year','time',
  'including','experience','business','management','research','harvard','hbs',
  'course','students','student','class','cases','case','school',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
  )
}

// ── Score a course against the user keyword set ───────────────────────────────
function scoreCourse(
  keywords: Set<string>,
  course: {
    course_title: string
    description: string | null
    unit: string | null
    faculty_name: string | null
  }
): number {
  let score = 0

  // Title match is highest signal
  const titleWords = course.course_title.toLowerCase().split(/\W+/)
  score += titleWords.filter(w => w.length > 3 && keywords.has(w)).length * 5

  // Unit/area match
  if (course.unit) {
    score += course.unit.toLowerCase().split(/\W+/)
      .filter(w => w.length > 3 && keywords.has(w)).length * 2
  }

  // Faculty name match (user may have mentioned a professor's research area)
  if (course.faculty_name) {
    score += course.faculty_name.toLowerCase().split(/\W+/)
      .filter(w => w.length > 3 && keywords.has(w)).length * 3
  }

  // Description word matches
  if (course.description) {
    score += course.description.toLowerCase().split(/\W+/)
      .filter(w => w.length > 3 && keywords.has(w)).length * 1
  }

  return score
}

// ── Format a course as a compact summary for Claude ───────────────────────────
function formatCourseSummary(c: {
  id: string
  course_title: string
  course_number: string | null
  faculty_name: string | null
  unit: string | null
  term: string | null
  quarter: string | null
  credits: number | null
  description: string | null
}): string {
  const lines = [
    `ID: ${c.id}`,
    `Title: ${c.course_title}${c.course_number ? ` (${c.course_number})` : ''}`,
  ]
  if (c.faculty_name) lines.push(`Faculty: ${c.faculty_name}`)
  if (c.unit)         lines.push(`Area: ${c.unit}`)
  const scheduling = [c.term, c.quarter, c.credits ? `${c.credits} credits` : ''].filter(Boolean).join(' | ')
  if (scheduling)     lines.push(`Scheduling: ${scheduling}`)
  if (c.description)  lines.push(`Description: ${c.description.slice(0, 400).replace(/\s+/g, ' ')}${c.description.length > 400 ? '…' : ''}`)
  return lines.join('\n')
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // ── 0. Guard: API key ─────────────────────────────────────────────────────
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return jsonResponse({ error: 'Server configuration error: Anthropic API key missing.' }, 500)
    }
    console.log('Step 0: API key present')

    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    console.log('Step 1: Authenticated', user.id)

    // ── 1b. Parse optional body ───────────────────────────────────────────────
    let electiveInterests = ''
    try {
      const body = await req.json()
      electiveInterests = (body?.elective_interests ?? '').toString().trim().slice(0, 1000)
    } catch { /* body is optional */ }

    // ── 2. Rate limit check ───────────────────────────────────────────────────
    const { count: runsToday } = await supabase
      .from('course_match_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', getTodayStart().toISOString())

    console.log('Step 2: runs today:', runsToday)
    if ((runsToday ?? 0) >= DAILY_LIMIT) {
      return jsonResponse({
        error: 'Daily limit reached. You can run course matching up to 3 times per day.',
        limitReached: true,
      }, 429)
    }

    // ── 3. Load user profile ──────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('hbs_ip')
      .select('professional_interests, additional_background, resume_text, linkedin_text, program, graduation_year')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) return jsonResponse({ error: 'No profile found. Create a profile first.' }, 404)
    console.log('Step 3: Profile loaded')

    // ── 4. Load all catalog courses ───────────────────────────────────────────
    const { data: courseRows, error: courseError } = await supabase
      .from('faculty_courses')
      .select('id, course_title, course_number, faculty_name, faculty_id, unit, term, quarter, credits, description')
      .eq('source', 'hbs_catalog_2026')
      .limit(500)

    if (courseError) throw courseError
    if (!courseRows || courseRows.length === 0) {
      return jsonResponse({ error: 'No course catalog data available yet.' }, 500)
    }
    console.log(`Step 4: loaded ${courseRows.length} courses`)

    // ── 5. Build keyword set and score courses ────────────────────────────────
    const userText = [
      profile.professional_interests ?? '',
      profile.additional_background ?? '',
      electiveInterests,
      (profile.resume_text ?? '').slice(0, 8000),
      (profile.linkedin_text ?? '').slice(0, 4000),
    ].filter(Boolean).join(' ')

    const keywords = tokenize(userText)
    console.log('Step 5: keyword count:', keywords.size)

    // Deduplicate courses by course_title+faculty_name for scoring
    // (catalog may have multiple rows per course for multi-faculty)
    const uniqueCourses = new Map<string, typeof courseRows[0]>()
    for (const c of courseRows) {
      const key = c.id  // each row is its own entry
      if (!uniqueCourses.has(key)) uniqueCourses.set(key, c)
    }

    const scored = Array.from(uniqueCourses.values())
      .map(c => ({ course: c, score: scoreCourse(keywords, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 35)
      .map(s => s.course)

    if (scored.length === 0) {
      return jsonResponse({ error: 'No matching courses found.' }, 500)
    }
    console.log(`Step 5: top candidates: ${scored.length}`)

    // ── 6. Build prompt and call Claude ──────────────────────────────────────
    const userSummary = [
      `Program: ${profile.program ?? 'MBA'}, Class of ${profile.graduation_year ?? 'N/A'}`,
      profile.professional_interests ? `Professional interests: ${profile.professional_interests}` : '',
      profile.additional_background  ? `Additional background: ${profile.additional_background}` : '',
      electiveInterests               ? `Elective interests specified: ${electiveInterests}` : '',
      profile.resume_text             ? `Resume (excerpt): ${profile.resume_text.slice(0, 1500)}` : '',
      profile.linkedin_text           ? `LinkedIn (excerpt): ${profile.linkedin_text.slice(0, 1000)}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are a course selection assistant for Harvard Business School's ProfFound platform.

Your task: given a second-year MBA student's profile and a list of HBS elective course candidates, select the 2–5 courses that would be the most valuable and genuinely well-matched for this student. Prioritize quality over quantity — only include a course if the fit is specific and compelling.

For each selected course return a JSON object with these exact keys:
- "course_id": the exact UUID string provided in the candidate's ID field
- "rank": integer starting at 1 (1 = strongest fit)
- "rationale": array of exactly 2 strings — each one a concrete, specific bullet explaining WHY this course fits this student's particular background, goals, or experiences. Reference specific details from the student's profile.

Return ONLY a valid JSON array. No markdown code fences, no preamble, no explanation.`

    const userMessage = `Student profile:\n${userSummary}\n\n---\n\nCourse candidates:\n\n${scored.map(formatCourseSummary).join('\n\n---\n\n')}`

    console.log('Step 6: calling Claude...')
    const rawText = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    console.log('Step 6: Claude responded, length:', rawText.length)

    // ── 7. Parse Claude response ──────────────────────────────────────────────
    const cleanJson = cleanJsonResponse(rawText)

    let aiMatches: Array<{ course_id: string; rank: number; rationale: string[] }>

    try {
      aiMatches = JSON.parse(cleanJson)
    } catch {
      console.error('Claude JSON parse failed. Raw:', rawText.slice(0, 300))
      return jsonResponse({ error: 'Course matching returned an unexpected response. Please try again.' }, 500)
    }

    aiMatches = aiMatches
      .filter(m => m.course_id && m.rank && Array.isArray(m.rationale))
      .map(m => ({ ...m, rationale: m.rationale.slice(0, 2) }))
      .slice(0, 5)

    if (aiMatches.length < 2) {
      return jsonResponse({ error: 'Could not generate enough course matches. Try enriching your profile.' }, 500)
    }
    console.log('Step 7: parsed', aiMatches.length, 'course matches')

    // ── 8. Write to DB ────────────────────────────────────────────────────────
    const { data: runData, error: runError } = await supabase
      .from('course_match_runs')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (runError) throw runError
    const runId = runData.id

    const { error: insertError } = await supabase.from('course_matches').insert(
      aiMatches.map(m => ({
        run_id:    runId,
        course_id: m.course_id,
        rank:      m.rank,
        rationale: m.rationale,
      }))
    )
    if (insertError) throw insertError
    console.log('Step 8: DB write complete, run_id:', runId)

    // ── 9. Return enriched matches ────────────────────────────────────────────
    const { data: enrichedMatches } = await supabase
      .from('course_matches')
      .select('*, faculty_courses(id, course_title, course_number, faculty_name, faculty_id, unit, term, quarter, credits, description)')
      .eq('run_id', runId)
      .order('rank')

    console.log('Step 9: done, returning', enrichedMatches?.length, 'enriched matches')
    return jsonResponse({ run_id: runId, matches: enrichedMatches })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-course-matches error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
