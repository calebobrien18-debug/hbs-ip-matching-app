/**
 * generate-case-ideas Edge Function
 * ===================================
 * Given a faculty match (by faculty_matches.id) and optional user steering text,
 * generates 2–4 HBS teaching case study ideas the student and faculty member could
 * co-develop together.
 *
 * Rate limit: 3 runs per user per UTC calendar day (tracked via case_idea_runs table).
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Parse body: { match_id, user_context }
 *   3. Check daily rate limit (count case_idea_runs for today)
 *   4. Load faculty_matches row → verify ownership via match_runs.user_id
 *   5. Load faculty profile (tags, pubs, courses, bio) + student hbs_ip
 *   6. Insert case_idea_runs row (counts the attempt before calling Claude)
 *   7. Call Claude Sonnet with structured prompt → parse 2–4 ideas as JSON
 *   8. Return { ideas }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const DAILY_LIMIT = 3

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Call Anthropic API via native fetch ───────────────────────────────────────
async function callClaude(params: {
  model: string
  max_tokens: number
  temperature: number
  system: string
  messages: Array<{ role: string; content: string }>
}): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    let errDetail = ''
    try { errDetail = JSON.stringify(await res.json()) } catch { /* ignore */ }
    throw new Error(`Anthropic API ${res.status}: ${errDetail}`)
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>
  }
  return data.content[0].text.trim()
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // ── 0. Guard: API key ─────────────────────────────────────────────────────
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

    // ── 2. Parse request body ─────────────────────────────────────────────────
    let match_id: string
    let user_context: string
    try {
      const body = await req.json()
      match_id = body.match_id ?? ''
      user_context = (body.user_context ?? '').toString().trim().slice(0, 1000)
    } catch {
      return jsonResponse({ error: 'Invalid request body.' }, 400)
    }
    if (!match_id) return jsonResponse({ error: 'match_id is required.' }, 400)
    console.log('Step 2: match_id:', match_id)

    // ── 3. Rate limit check ───────────────────────────────────────────────────
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('case_idea_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    console.log('Step 3: runs today:', todayCount)
    if ((todayCount ?? 0) >= DAILY_LIMIT) {
      return jsonResponse({
        error: 'Daily limit reached. You can generate case study ideas up to 3 times per day.',
        limitReached: true,
      }, 429)
    }

    // ── 4. Load faculty_matches row + verify ownership ────────────────────────
    const { data: matchRow, error: matchErr } = await supabase
      .from('faculty_matches')
      .select('*, match_runs!inner(user_id)')
      .eq('id', match_id)
      .maybeSingle()

    if (matchErr) throw matchErr
    if (!matchRow) return jsonResponse({ error: 'Match not found.' }, 404)

    // Ownership check: the match's run must belong to this user
    const runOwnerId = (matchRow.match_runs as { user_id: string })?.user_id
    if (runOwnerId !== user.id) {
      return jsonResponse({ error: 'Match not found.' }, 404)
    }

    const facultyId = matchRow.faculty_id
    console.log('Step 4: match verified, faculty_id:', facultyId)

    // ── 5. Load faculty data + student profile in parallel ────────────────────
    const [
      { data: facultyRow,   error: fe },
      { data: tagRows,      error: te },
      { data: pubRows,      error: pe },
      { data: courseRows,   error: coe },
      { data: profile,      error: pre },
    ] = await Promise.all([
      supabase.from('faculty').select('id, name, title, unit, bio').eq('id', facultyId).maybeSingle(),
      supabase.from('faculty_tags').select('tag').eq('faculty_id', facultyId),
      supabase.from('faculty_publications').select('title, year').eq('faculty_id', facultyId).order('year', { ascending: false }).limit(8),
      supabase.from('faculty_courses').select('course_title').eq('faculty_id', facultyId),
      supabase.from('hbs_ip').select(
        'professional_interests, additional_background, program, graduation_year, resume_text, linkedin_text'
      ).eq('user_id', user.id).maybeSingle(),
    ])

    if (fe) throw fe; if (te) throw te; if (pe) throw pe; if (coe) throw coe; if (pre) throw pre

    if (!facultyRow) return jsonResponse({ error: 'Faculty not found.' }, 404)
    if (!profile)    return jsonResponse({ error: 'No profile found. Create a profile first.' }, 404)

    console.log('Step 5: data loaded — faculty:', facultyRow.name)

    // ── 6. Insert case_idea_runs row (counts attempt before calling Claude) ───
    const { error: runInsertErr } = await supabase
      .from('case_idea_runs')
      .insert({ user_id: user.id, match_id })

    if (runInsertErr) throw runInsertErr
    console.log('Step 6: case_idea_runs row inserted')

    // ── 7. Build prompt and call Claude ───────────────────────────────────────
    const tags         = (tagRows ?? []).map(r => r.tag)
    const pubTitles    = (pubRows ?? []).map(r => r.title)
    const courseTitles = (courseRows ?? []).map(r => r.course_title)

    const facultySummary = [
      `Name: ${facultyRow.name}${facultyRow.unit ? ` | Unit: ${facultyRow.unit}` : ''}`,
      facultyRow.title ? `Title: ${facultyRow.title}` : '',
      facultyRow.bio   ? `Bio: ${facultyRow.bio.slice(0, 300).replace(/\s+/g, ' ')}…` : '',
      tags.length         ? `Research areas: ${tags.join(', ')}` : '',
      pubTitles.length    ? `Publications: ${pubTitles.join(' | ')}` : '',
      courseTitles.length ? `Courses taught: ${courseTitles.join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const matchContext = [
      `Match strength: ${matchRow.match_strength}`,
      matchRow.match_reasons?.length    ? `Why they matched:\n${(matchRow.match_reasons as string[]).map(r => `- ${r}`).join('\n')}` : '',
      matchRow.collaboration_ideas?.length ? `Collaboration ideas already surfaced:\n${(matchRow.collaboration_ideas as string[]).map(c => `- ${c}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')

    const studentSummary = [
      `Program: ${profile.program ?? 'Not specified'}, Class of ${profile.graduation_year ?? 'N/A'}`,
      profile.professional_interests  ? `Professional interests: ${profile.professional_interests}` : '',
      profile.additional_background   ? `Additional background: ${profile.additional_background}` : '',
      profile.resume_text             ? `Resume excerpt: ${profile.resume_text.slice(0, 1200)}` : '',
      profile.linkedin_text           ? `LinkedIn excerpt: ${profile.linkedin_text.slice(0, 800)}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are an HBS case study development expert. Harvard Business School teaching cases center on real business decisions faced by real leaders. They are protagonist-centered, teach generalizable lessons, and are used in MBA classrooms worldwide.

Your task: generate 2–4 compelling HBS teaching case study ideas that this student and faculty member could realistically co-develop together.

Each idea should:
- Be grounded in real-world business situations (specific companies, industries, or decisions)
- Align with the faculty member's documented research areas and publications
- Draw on the student's professional background as unique domain expertise or access
- Be appropriate for use in an HBS MBA course

Return ONLY a valid JSON array. No markdown code fences, no preamble, no explanation.

Each item in the array must have exactly these keys:
- "title": string — a specific, compelling case title (not generic)
- "premise": string — 2-3 sentences describing the business situation and the decision/dilemma at its center
- "protagonist": string — the company, leader, or institution at the center of the case
- "teaching_themes": string[] — exactly 2-3 business concepts this case would teach
- "student_angle": string — one sentence explaining why this student's background makes them ideal as co-author (cite specifics)
- "faculty_angle": string — one sentence explaining how the faculty member's specific research or courses connect`

    const userMessage = [
      'FACULTY MEMBER:',
      facultySummary,
      '',
      'MATCH CONTEXT:',
      matchContext,
      '',
      'STUDENT PROFILE:',
      studentSummary,
      user_context
        ? `\n<USER STEERING>\n${user_context}\n</USER STEERING>`
        : '',
    ].filter(s => s !== undefined).join('\n')

    console.log('Step 7: calling Claude...')
    const rawText = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    console.log('Step 7: Claude responded, length:', rawText.length)

    // ── 8. Parse and validate response ────────────────────────────────────────
    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let ideas: Array<{
      title: string; premise: string; protagonist: string
      teaching_themes: string[]; student_angle: string; faculty_angle: string
    }>

    try {
      ideas = JSON.parse(cleanJson)
    } catch {
      console.error('Claude JSON parse failed. Raw:', rawText.slice(0, 300))
      return jsonResponse({ error: 'Idea generation returned an unexpected response. Please try again.' }, 500)
    }

    ideas = (Array.isArray(ideas) ? ideas : [])
      .filter(i =>
        i.title && i.premise && i.protagonist &&
        Array.isArray(i.teaching_themes) && i.student_angle && i.faculty_angle
      )
      .slice(0, 4)

    console.log('Step 8: parsed', ideas.length, 'ideas, returning')
    return jsonResponse({ ideas, runsToday: (todayCount ?? 0) + 1 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-case-ideas error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
