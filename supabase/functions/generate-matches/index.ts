/**
 * generate-matches Edge Function
 * ================================
 * Analyzes a user's profile (text fields + pre-extracted PDF text) against
 * all faculty profiles, then uses Claude Sonnet to select 2–10 ranked matches
 * with qualitative reasoning and collaboration ideas.
 *
 * Uses Deno's native fetch to call the Anthropic API directly — no SDK import
 * needed, which avoids npm/Deno compatibility issues in the Edge Runtime.
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Load user profile from hbs_ip
 *   3. Load all faculty with tags, publications, courses
 *   4. Keyword scoring to narrow to top 20 candidates
 *   5. Claude Sonnet selects final 2–10 matches with reasoning
 *   6. Write match_runs + faculty_matches rows to DB
 *   7. Return { run_id, matches }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const DAILY_LIMIT = 3

// ── CORS headers included on every response ───────────────────────────────────
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

// ── Call the Anthropic Messages API directly via fetch ────────────────────────
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

// ── Stopwords filtered out of keyword tokenization ────────────────────────────
const STOPWORDS = new Set([
  'the','and','for','are','was','were','has','have','had','will','would','could',
  'should','been','being','with','from','this','that','these','those','they',
  'their','them','then','than','also','more','some','such','into','over','when',
  'where','while','which','what','your','about','after','before','between',
  'during','through','other','work','worked','working','years','year','time',
  'including','experience','business','management','research','harvard','hbs',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
  )
}

// ── Score a faculty member against the user keyword set ───────────────────────
function scoreFaculty(
  keywords: Set<string>,
  faculty: { bio: string | null; tags: string[]; pubTitles: string[] },
  facultyNameInMind: string
): number {
  let score = 0
  for (const tag of faculty.tags) {
    score += tag.toLowerCase().split(/\s+/).filter(w => keywords.has(w)).length * 3
  }
  if (faculty.bio) {
    score += faculty.bio.toLowerCase().split(/\W+/).filter(w => w.length > 3 && keywords.has(w)).length * 0.8
  }
  for (const title of faculty.pubTitles) {
    score += title.toLowerCase().split(/\W+/).filter(w => w.length > 3 && keywords.has(w)).length * 0.4
  }
  if (facultyNameInMind) score += 10
  return score
}

// ── Format a faculty record as a compact summary for Claude ───────────────────
function formatFacultySummary(f: {
  id: string; name: string; unit: string | null; bio: string | null
  tags: string[]; pubTitles: string[]; courseTitles: string[]
}): string {
  const lines = [
    `ID: ${f.id}`,
    `Name: ${f.name}${f.unit ? ` | Unit: ${f.unit}` : ''}`,
  ]
  if (f.tags.length)         lines.push(`Research tags: ${f.tags.join(', ')}`)
  if (f.pubTitles.length)    lines.push(`Recent publications: ${f.pubTitles.slice(0, 3).join(' | ')}`)
  if (f.courseTitles.length) lines.push(`Courses taught: ${f.courseTitles.join(', ')}`)
  if (f.bio)                 lines.push(`Bio: ${f.bio.slice(0, 150).replace(/\s+/g, ' ')}…`)
  return lines.join('\n')
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // ── 0. Guard: API key must be configured ──────────────────────────────────
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

    // ── 1b. Rate limit check ──────────────────────────────────────────────────
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const { count: runsToday } = await supabase
      .from('match_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    console.log('Step 1b: runs today:', runsToday)
    if ((runsToday ?? 0) >= DAILY_LIMIT) {
      return jsonResponse({
        error: 'Daily limit reached. You can run matching up to 3 times per day.',
        limitReached: true,
      }, 429)
    }

    // ── 2. Load user profile ──────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('hbs_ip')
      .select('professional_interests, additional_background, faculty_in_mind, resume_text, linkedin_text, program, graduation_year')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) return jsonResponse({ error: 'No profile found. Create a profile first.' }, 404)
    console.log('Step 2: Profile loaded. resume_text:', !!profile.resume_text, 'linkedin_text:', !!profile.linkedin_text)

    // ── 3. Load faculty data ──────────────────────────────────────────────────
    const [
      { data: facultyRows, error: fe },
      { data: tagRows,     error: te },
      { data: pubRows,     error: pe },
      { data: courseRows,  error: ce },
    ] = await Promise.all([
      supabase.from('faculty').select('id, name, unit, bio'),
      supabase.from('faculty_tags').select('faculty_id, tag'),
      supabase.from('faculty_publications').select('faculty_id, title, year').order('year', { ascending: false }),
      supabase.from('faculty_courses').select('faculty_id, course_title'),
    ])

    if (fe) throw fe; if (te) throw te; if (pe) throw pe; if (ce) throw ce
    console.log(`Step 3: faculty=${facultyRows?.length} tags=${tagRows?.length} pubs=${pubRows?.length} courses=${courseRows?.length}`)

    // Group by faculty_id
    const tagsByFaculty: Record<string, string[]> = {}
    for (const r of (tagRows ?? [])) {
      if (!tagsByFaculty[r.faculty_id]) tagsByFaculty[r.faculty_id] = []
      tagsByFaculty[r.faculty_id].push(r.tag)
    }
    const pubsByFaculty: Record<string, string[]> = {}
    for (const r of (pubRows ?? [])) {
      if (!pubsByFaculty[r.faculty_id]) pubsByFaculty[r.faculty_id] = []
      if (pubsByFaculty[r.faculty_id].length < 5) pubsByFaculty[r.faculty_id].push(r.title)
    }
    const coursesByFaculty: Record<string, string[]> = {}
    for (const r of (courseRows ?? [])) {
      if (!coursesByFaculty[r.faculty_id]) coursesByFaculty[r.faculty_id] = []
      coursesByFaculty[r.faculty_id].push(r.course_title)
    }

    // ── 4. Build keyword set and score faculty ────────────────────────────────
    const userText = [
      profile.professional_interests ?? '',
      profile.additional_background ?? '',
      profile.faculty_in_mind ?? '',
      (profile.resume_text ?? '').slice(0, 8000),
      (profile.linkedin_text ?? '').slice(0, 4000),
    ].filter(Boolean).join(' ')

    const keywords = tokenize(userText)
    const facultyInMindLower = (profile.faculty_in_mind ?? '').toLowerCase()
    console.log('Step 4: keyword count:', keywords.size)

    const allFaculty = (facultyRows ?? []).map(f => ({
      ...f,
      tags: tagsByFaculty[f.id] ?? [],
      pubTitles: pubsByFaculty[f.id] ?? [],
      courseTitles: coursesByFaculty[f.id] ?? [],
    }))

    const scored = allFaculty
      .map(f => ({
        faculty: f,
        score: scoreFaculty(
          keywords,
          { bio: f.bio, tags: f.tags, pubTitles: f.pubTitles },
          f.name.toLowerCase().split(' ').some(p => facultyInMindLower.includes(p)) ? f.name : ''
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(s => s.faculty)

    if (scored.length === 0) return jsonResponse({ error: 'No faculty data available.' }, 500)
    console.log('Step 4: top candidates:', scored.length)

    // ── 5. Build prompt and call Claude ──────────────────────────────────────
    const userSummary = [
      `Program: ${profile.program ?? 'Not specified'}, Class of ${profile.graduation_year ?? 'N/A'}`,
      profile.professional_interests ? `Professional interests: ${profile.professional_interests}` : '',
      profile.additional_background ? `Additional background: ${profile.additional_background}` : '',
      profile.faculty_in_mind ? `Faculty already in mind: ${profile.faculty_in_mind}` : '',
      profile.resume_text ? `Resume highlights (excerpt): ${profile.resume_text.slice(0, 1500)}` : '',
      profile.linkedin_text ? `LinkedIn highlights (excerpt): ${profile.linkedin_text.slice(0, 1000)}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are a faculty matching assistant for Harvard Business School's ProfFound platform.

Your task: given a student profile and a list of HBS faculty candidates, select the 2–6 faculty who would be the most compelling thought partners for this student. Prioritize quality over quantity — only include a faculty member if the match is genuinely strong and specific. Order from strongest to weakest match.

For each selected faculty return a JSON object with these exact keys:
- "faculty_id": the exact UUID string provided in the candidate's ID field
- "rank": integer starting at 1 (1 = strongest match)
- "match_strength": one of "strong", "good", or "exploratory"
- "match_reasons": array of 2–3 strings, each citing a SPECIFIC piece of research, publication title, or course taught — make each reason concrete and personal to this student's background
- "collaboration_ideas": array of 1–2 strings describing concrete ways to work together, referencing the student's specific background and the faculty's specific work

Return ONLY a valid JSON array. No markdown code fences, no preamble, no explanation.`

    console.log('Step 5: calling Claude...')
    const rawText = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Student profile:\n${userSummary}\n\n---\n\nFaculty candidates:\n\n${scored.map(formatFacultySummary).join('\n\n---\n\n')}` }],
    })
    console.log('Step 5: Claude responded, length:', rawText.length)

    // ── 6. Parse Claude response ──────────────────────────────────────────────
    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let matches: Array<{
      faculty_id: string; rank: number; match_strength: string
      match_reasons: string[]; collaboration_ideas: string[]
    }>

    try {
      matches = JSON.parse(cleanJson)
    } catch {
      console.error('Claude JSON parse failed. Raw:', rawText.slice(0, 300))
      return jsonResponse({ error: 'Matching service returned an unexpected response. Please try again.' }, 500)
    }

    matches = matches
      .filter(m => m.faculty_id && m.rank && Array.isArray(m.match_reasons) && Array.isArray(m.collaboration_ideas))
      .slice(0, 6)

    if (matches.length < 2) {
      return jsonResponse({ error: 'Could not generate enough matches. Try enriching your profile.' }, 500)
    }
    console.log('Step 6: parsed', matches.length, 'matches')

    // ── 7. Write to DB ────────────────────────────────────────────────────────
    const { data: runData, error: runError } = await supabase
      .from('match_runs')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (runError) throw runError
    const runId = runData.id

    const { error: insertError } = await supabase.from('faculty_matches').insert(
      matches.map(m => ({
        run_id: runId,
        faculty_id: m.faculty_id,
        rank: m.rank,
        match_strength: ['strong', 'good', 'exploratory'].includes(m.match_strength) ? m.match_strength : 'good',
        match_reasons: m.match_reasons.slice(0, 3),
        collaboration_ideas: m.collaboration_ideas.slice(0, 2),
      }))
    )
    if (insertError) throw insertError
    console.log('Step 7: DB write complete, run_id:', runId)

    // ── 8. Return enriched matches ────────────────────────────────────────────
    const { data: enrichedMatches } = await supabase
      .from('faculty_matches')
      .select('*, faculty(id, name, unit, image_url, title, bio)')
      .eq('run_id', runId)
      .order('rank')

    console.log('Step 8: done, returning', enrichedMatches?.length, 'enriched matches')
    return jsonResponse({ run_id: runId, matches: enrichedMatches })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-matches error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
