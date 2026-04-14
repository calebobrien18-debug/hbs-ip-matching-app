/**
 * generate-matches Edge Function
 * ================================
 * Analyzes a user's profile (text fields + pre-extracted PDF text) against
 * all faculty profiles, then uses Claude Sonnet to select 2–10 ranked matches
 * with qualitative reasoning and collaboration ideas.
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
import Anthropic from 'npm:@anthropic-ai/sdk'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

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
    text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  )
}

// ── Score a faculty member against the user keyword set ───────────────────────
function scoreFaculty(
  keywords: Set<string>,
  faculty: {
    bio: string | null
    tags: string[]
    pubTitles: string[]
  },
  facultyNameInMind: string
): number {
  let score = 0

  // Tag overlap — highest weight (most curated signal)
  for (const tag of faculty.tags) {
    const tagWords = tag.toLowerCase().split(/\s+/)
    score += tagWords.filter(w => keywords.has(w)).length * 3
  }

  // Bio keyword hits
  if (faculty.bio) {
    const bioWords = faculty.bio.toLowerCase().split(/\W+/)
    score += bioWords.filter(w => w.length > 3 && keywords.has(w)).length * 0.8
  }

  // Publication title hits
  for (const title of faculty.pubTitles) {
    const titleWords = title.toLowerCase().split(/\W+/)
    score += titleWords.filter(w => w.length > 3 && keywords.has(w)).length * 0.4
  }

  // Explicit name mention bonus
  if (facultyNameInMind) {
    score += 10
  }

  return score
}

// ── Format a faculty record as a compact summary for Claude ───────────────────
function formatFacultySummary(f: {
  id: string
  name: string
  unit: string | null
  bio: string | null
  tags: string[]
  pubTitles: string[]
  courseTitles: string[]
}): string {
  const lines = [
    `ID: ${f.id}`,
    `Name: ${f.name}${f.unit ? ` | Unit: ${f.unit}` : ''}`,
  ]
  if (f.tags.length)        lines.push(`Research tags: ${f.tags.join(', ')}`)
  if (f.pubTitles.length)   lines.push(`Recent publications: ${f.pubTitles.slice(0, 3).join(' | ')}`)
  if (f.courseTitles.length) lines.push(`Courses taught: ${f.courseTitles.join(', ')}`)
  if (f.bio)                lines.push(`Bio: ${f.bio.slice(0, 150).replace(/\s+/g, ' ')}…`)
  return lines.join('\n')
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    const userId = user.id

    // 2. Load user profile
    const { data: profile, error: profileError } = await supabase
      .from('hbs_ip')
      .select('professional_interests, additional_background, faculty_in_mind, resume_text, linkedin_text, program, graduation_year')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return jsonResponse({ error: 'No profile found. Create a profile first.' }, 404)
    }

    // 3. Load all faculty with tags, publications, courses
    const [
      { data: facultyRows },
      { data: tagRows },
      { data: pubRows },
      { data: courseRows },
    ] = await Promise.all([
      supabase.from('faculty').select('id, name, unit, bio'),
      supabase.from('faculty_tags').select('faculty_id, tag'),
      supabase.from('faculty_publications').select('faculty_id, title, year').order('year', { ascending: false }),
      supabase.from('faculty_courses').select('faculty_id, course_title'),
    ])

    // Group tags, pubs, courses by faculty_id
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

    // 4. Build keyword set from user profile
    const userTextParts = [
      profile.professional_interests ?? '',
      profile.additional_background ?? '',
      profile.faculty_in_mind ?? '',
      (profile.resume_text ?? '').slice(0, 8000),
      (profile.linkedin_text ?? '').slice(0, 4000),
    ]
    const userText = userTextParts.filter(Boolean).join(' ')
    const keywords = tokenize(userText)
    const facultyInMindLower = (profile.faculty_in_mind ?? '').toLowerCase()

    // 5. Score all faculty and take top 20
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
          f.name.toLowerCase().split(' ').some(part => facultyInMindLower.includes(part)) ? f.name : ''
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(s => s.faculty)

    if (scored.length === 0) {
      return jsonResponse({ error: 'No faculty data available for matching.' }, 500)
    }

    // 6. Build Claude prompt
    const userSummary = [
      `Program: ${profile.program ?? 'Not specified'}, Class of ${profile.graduation_year ?? 'N/A'}`,
      profile.professional_interests ? `Professional interests: ${profile.professional_interests}` : '',
      profile.additional_background ? `Additional background: ${profile.additional_background}` : '',
      profile.faculty_in_mind ? `Faculty already in mind: ${profile.faculty_in_mind}` : '',
      profile.resume_text ? `Resume highlights (excerpt): ${profile.resume_text.slice(0, 1500)}` : '',
      profile.linkedin_text ? `LinkedIn highlights (excerpt): ${profile.linkedin_text.slice(0, 1000)}` : '',
    ].filter(Boolean).join('\n')

    const facultySummaries = scored.map(formatFacultySummary).join('\n\n---\n\n')

    const systemPrompt = `You are a faculty matching assistant for Harvard Business School's ProfFound platform.

Your task: given a student profile and a list of HBS faculty candidates, select the 2–10 faculty who would be the most compelling thought partners for this student. Order from strongest to weakest match.

For each selected faculty return a JSON object with these exact keys:
- "faculty_id": the exact UUID string provided in the candidate's ID field
- "rank": integer starting at 1 (1 = strongest match)
- "match_strength": one of "strong", "good", or "exploratory"
- "match_reasons": array of 2–3 strings, each citing a SPECIFIC piece of research, publication title, or course taught — make each reason concrete and personal to this student's background
- "collaboration_ideas": array of 1–2 strings describing concrete ways to work together, referencing the student's specific background and the faculty's specific work (e.g., "Co-develop a case study on founder-led turnarounds drawing on your experience scaling [Company]", "Research assistantship on ESG disclosure norms — aligns directly with your fintech compliance work at [Firm]")

Return ONLY a valid JSON array. No markdown code fences, no preamble, no explanation.`

    const userMessage = `Student profile:\n${userSummary}\n\n---\n\nFaculty candidates:\n\n${facultySummaries}`

    // 7. Call Claude Sonnet
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = (claudeResponse.content[0] as { type: string; text: string }).text.trim()
    // Strip any accidental markdown fences
    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let matches: Array<{
      faculty_id: string
      rank: number
      match_strength: string
      match_reasons: string[]
      collaboration_ideas: string[]
    }>

    try {
      matches = JSON.parse(cleanJson)
    } catch {
      console.error('Claude returned invalid JSON:', rawText)
      return jsonResponse({ error: 'Matching service returned an unexpected response. Please try again.' }, 500)
    }

    // Validate and sanitize matches
    matches = matches
      .filter(m => m.faculty_id && m.rank && Array.isArray(m.match_reasons) && Array.isArray(m.collaboration_ideas))
      .slice(0, 10)

    if (matches.length < 2) {
      return jsonResponse({ error: 'Could not generate enough matches. Try enriching your profile.' }, 500)
    }

    // 8. Write to DB — service role bypasses RLS
    const { data: runData, error: runError } = await supabase
      .from('match_runs')
      .insert({ user_id: userId })
      .select('id')
      .single()

    if (runError) throw runError
    const runId = runData.id

    const matchRows = matches.map(m => ({
      run_id: runId,
      faculty_id: m.faculty_id,
      rank: m.rank,
      match_strength: ['strong', 'good', 'exploratory'].includes(m.match_strength) ? m.match_strength : 'good',
      match_reasons: m.match_reasons.slice(0, 3),
      collaboration_ideas: m.collaboration_ideas.slice(0, 2),
    }))

    const { error: insertError } = await supabase.from('faculty_matches').insert(matchRows)
    if (insertError) throw insertError

    // 9. Fetch enriched match data for the response (join faculty table)
    const { data: enrichedMatches } = await supabase
      .from('faculty_matches')
      .select('*, faculty(id, name, unit, image_url, title, bio)')
      .eq('run_id', runId)
      .order('rank')

    return jsonResponse({ run_id: runId, matches: enrichedMatches })
  } catch (err) {
    console.error('generate-matches error:', err)
    return jsonResponse({ error: 'Internal server error. Please try again.' }, 500)
  }
})
