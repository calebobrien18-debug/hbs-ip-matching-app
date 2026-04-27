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
import { CORS, jsonResponse, checkAnthropicKey, requireAuth, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const DAILY_LIMIT = 3

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
    const keyErr = checkAnthropicKey()
    if (keyErr) return keyErr
    console.log('Step 0: API key present')

    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const { user, errorResponse: authErr } = await requireAuth(req, supabase)
    if (authErr) return authErr
    console.log('Step 1: Authenticated', user!.id)

    // ── 1b. Rate-limit: claim slot first, then verify count ──────────────────
    // Insert the run row before the expensive Claude call so the slot is claimed
    // early. Count AFTER insert (count includes this new row) — if over limit,
    // delete the slot and reject. This narrows the concurrency race window
    // significantly vs. pure count-then-insert.
    //
    // Fully atomic follow-up: add a DB-side RPC that does a SELECT ... FOR UPDATE
    // on a per-user daily_run_counts row and returns "allowed | denied" atomically.
    const { data: tentativeRun, error: runInsertErr } = await supabase
      .from('match_runs')
      .insert({ user_id: user!.id })
      .select('id')
      .single()

    if (runInsertErr) throw runInsertErr
    const runId = tentativeRun.id

    const { count: runsToday } = await supabase
      .from('match_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gte('created_at', getTodayStart().toISOString())

    console.log('Step 1b: runs today (incl. this):', runsToday)
    if ((runsToday ?? 0) > DAILY_LIMIT) {
      await supabase.from('match_runs').delete().eq('id', runId)
      return jsonResponse({
        error: `Daily limit reached. You can run matching up to ${DAILY_LIMIT} times per day.`,
        limitReached: true,
      }, 429)
    }

    // ── 2. Load user profile ──────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('hbs_ip')
      .select('professional_interests, additional_background, faculty_in_mind, resume_text, linkedin_text, topics_to_explore, program, graduation_year')
      .eq('user_id', user!.id)
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
      profile.topics_to_explore ?? '',
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

    // Build set of allowed faculty IDs (only candidates actually sent to Claude)
    const allowedIds = new Set(scored.map(f => f.id))

    // ── 5. Build prompt and call Claude ──────────────────────────────────────
    const userSummary = [
      `Program: ${profile.program ?? 'Not specified'}, Class of ${profile.graduation_year ?? 'N/A'}`,
      profile.professional_interests ? `Professional interests: ${profile.professional_interests}` : '',
      profile.additional_background ? `Additional background: ${profile.additional_background}` : '',
      profile.faculty_in_mind ? `Faculty already in mind: ${profile.faculty_in_mind}` : '',
      profile.resume_text ? `Resume highlights (excerpt): ${profile.resume_text.slice(0, 1500)}` : '',
      profile.linkedin_text ? `LinkedIn highlights (excerpt): ${profile.linkedin_text.slice(0, 1000)}` : '',
      profile.topics_to_explore ? `Topics I want to explore at HBS: ${profile.topics_to_explore}` : '',
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

    // ── 6. Parse and validate Claude response ────────────────────────────────
    const cleanJson = cleanJsonResponse(rawText)

    let rawMatches: Array<{
      faculty_id: string; rank: number; match_strength: string
      match_reasons: string[]; collaboration_ideas: string[]
    }>

    try {
      rawMatches = JSON.parse(cleanJson)
    } catch {
      console.error('Claude JSON parse failed. Raw:', rawText.slice(0, 300))
      return jsonResponse({ error: 'Matching service returned an unexpected response. Please try again.' }, 500)
    }

    const validStrengths = new Set(['strong', 'good', 'exploratory'])
    const seenFaculty = new Set<string>()

    const matches = (Array.isArray(rawMatches) ? rawMatches : [])
      .filter(m => {
        if (!m.faculty_id || !allowedIds.has(m.faculty_id)) return false
        if (seenFaculty.has(m.faculty_id)) return false
        seenFaculty.add(m.faculty_id)
        if (!Array.isArray(m.match_reasons) || !Array.isArray(m.collaboration_ideas)) return false
        if (!m.match_reasons.some(r => typeof r === 'string' && r.trim())) return false
        if (!m.collaboration_ideas.some(c => typeof c === 'string' && c.trim())) return false
        return true
      })
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .slice(0, 6)
      .map((m, i) => ({
        faculty_id: m.faculty_id,
        rank: i + 1,
        match_strength: validStrengths.has(m.match_strength) ? m.match_strength : 'good',
        match_reasons: m.match_reasons.filter(r => typeof r === 'string' && r.trim()).map(r => r.trim()).slice(0, 3),
        collaboration_ideas: m.collaboration_ideas.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim()).slice(0, 2),
      }))

    if (matches.length < 2) {
      return jsonResponse({ error: 'Could not generate enough valid matches. Try enriching your profile.' }, 500)
    }
    console.log('Step 6: validated', matches.length, 'matches')

    // ── 7. Write to DB ────────────────────────────────────────────────────────
    // run row was already created in step 1b; just write the match rows
    const { error: insertError } = await supabase.from('faculty_matches').insert(
      matches.map(m => ({
        run_id: runId,
        faculty_id: m.faculty_id,
        rank: m.rank,
        match_strength: m.match_strength,
        match_reasons: m.match_reasons,
        collaboration_ideas: m.collaboration_ideas,
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

// Note: if an error occurs after step 1b (run slot created) but before step 7
// (faculty_matches written), the orphaned match_runs row is left in the DB.
// This is acceptable — it counts against the daily limit for that day, which
// prevents retrying past the limit on transient failures. A cleanup job could
// periodically remove match_runs rows with no associated faculty_matches rows.
