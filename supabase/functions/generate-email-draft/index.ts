/**
 * generate-email-draft Edge Function
 * ====================================
 * Given a faculty_id and a list of saved_case_ideas ids, generates a personalized
 * cold-outreach email from the student to the professor, pitching one or more
 * saved case study ideas.
 *
 * Rate limit: 10 drafts per user per UTC calendar day (tracked via email_draft_runs).
 *
 * Flow:
 *   1. Verify JWT → resolve user_id
 *   2. Parse body: { faculty_id, idea_ids: string[] }
 *   3. Check daily rate limit (count email_draft_runs for today)
 *   4. Load faculty + student profile + selected saved_case_ideas in parallel
 *   5. Insert email_draft_runs row (counts attempt before calling Claude)
 *   6. Call Claude Sonnet with structured prompt → parse { subject, body } JSON
 *   7. Return { subject, body }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, jsonResponse, callClaude, getTodayStart, cleanJsonResponse } from '../_shared/mod.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const DAILY_LIMIT = 10

// ── Truncate text to N words ──────────────────────────────────────────────────
function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return words.slice(0, maxWords).join(' ') + '…'
}

// ── Truncate to N sentences ───────────────────────────────────────────────────
function truncateSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  return sentences.slice(0, max).join(' ').trim()
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
    let faculty_id: string
    let idea_ids: string[]
    try {
      const body = await req.json()
      faculty_id = (body.faculty_id ?? '').toString().trim()
      idea_ids = Array.isArray(body.idea_ids) ? body.idea_ids.slice(0, 5) : []
    } catch {
      return jsonResponse({ error: 'Invalid request body.' }, 400)
    }
    if (!faculty_id) return jsonResponse({ error: 'faculty_id is required.' }, 400)
    if (idea_ids.length === 0) return jsonResponse({ error: 'Select at least one idea to pitch.' }, 400)
    console.log('Step 2: faculty_id:', faculty_id, 'idea_ids:', idea_ids.length)

    // ── 3. Rate limit check ───────────────────────────────────────────────────
    const { count: todayCount } = await supabase
      .from('email_draft_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', getTodayStart().toISOString())

    console.log('Step 3: email drafts today:', todayCount)
    if ((todayCount ?? 0) >= DAILY_LIMIT) {
      return jsonResponse({
        error: `Daily limit reached. You can generate up to ${DAILY_LIMIT} email drafts per day.`,
        limitReached: true,
      }, 429)
    }

    // ── 4. Load data in parallel ──────────────────────────────────────────────
    const [
      { data: facultyRow,  error: fe },
      { data: profile,     error: pre },
      { data: ideaRows,    error: ie },
    ] = await Promise.all([
      supabase.from('faculty')
        .select('id, name, title, unit, bio')
        .eq('id', faculty_id)
        .maybeSingle(),
      supabase.from('hbs_ip')
        .select('first_name, last_name, program, graduation_year, professional_interests, additional_background, resume_text')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('saved_case_ideas')
        .select('id, title, premise, student_angle')
        .in('id', idea_ids)
        .eq('user_id', user.id),   // ownership check
    ])

    if (fe)  throw fe
    if (pre) throw pre
    if (ie)  throw ie

    if (!facultyRow) return jsonResponse({ error: 'Faculty not found.' }, 404)
    if (!profile)    return jsonResponse({ error: 'No profile found. Create a profile first.' }, 404)
    if (!ideaRows || ideaRows.length === 0) {
      return jsonResponse({ error: 'No matching ideas found.' }, 404)
    }

    console.log('Step 4: data loaded — faculty:', facultyRow.name, 'ideas:', ideaRows.length)

    // ── 5. Insert email_draft_runs row ────────────────────────────────────────
    const { error: runInsertErr } = await supabase
      .from('email_draft_runs')
      .insert({ user_id: user.id, faculty_id })

    if (runInsertErr) throw runInsertErr
    console.log('Step 5: email_draft_runs row inserted')

    // ── 6. Build prompt and call Claude ───────────────────────────────────────
    const studentName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'An HBS student'
    const program = profile.program ?? 'MBA'
    const classYear = profile.graduation_year ? `Class of ${profile.graduation_year}` : ''

    const backgroundText = profile.additional_background
      ? truncateWords(profile.additional_background, 150)
      : profile.resume_text
        ? truncateWords(profile.resume_text, 150)
        : ''

    const ideaBlocks = ideaRows.map((idea, i) => {
      const premiseTruncated = truncateSentences(idea.premise ?? '', 4)
      const angleTruncated   = truncateSentences(idea.student_angle ?? '', 2)
      return [
        `Idea ${i + 1}: ${idea.title}`,
        `Premise: ${premiseTruncated}`,
        angleTruncated ? `Student angle: ${angleTruncated}` : '',
      ].filter(Boolean).join('\n')
    }).join('\n\n')

    const systemPrompt = `You write concise, professional cold-outreach emails for MBA students at Harvard Business School. You are direct and respectful of the recipient's time. Never use hollow filler phrases like "I hope this email finds you well" or "I wanted to reach out". The purpose of the email must be clear in the opening sentence.`

    const userMessage = [
      `Write a cold-outreach email from the following HBS student to the following professor.`,
      ``,
      `STUDENT:`,
      `Name: ${studentName}`,
      `Program: ${program}${classYear ? `, ${classYear}` : ''}`,
      profile.professional_interests ? `Interests: ${profile.professional_interests}` : '',
      backgroundText ? `Background: ${backgroundText}` : '',
      ``,
      `PROFESSOR:`,
      `Name: ${facultyRow.name}`,
      facultyRow.title ? `Title: ${facultyRow.title}` : '',
      facultyRow.unit  ? `Unit: ${facultyRow.unit}` : '',
      facultyRow.bio   ? `Bio: ${facultyRow.bio.slice(0, 200).replace(/\s+/g, ' ')}…` : '',
      ``,
      `CASE STUDY IDEA${ideaRows.length > 1 ? 'S' : ''} TO PITCH (${ideaRows.length}):`,
      ideaBlocks,
      ``,
      `INSTRUCTIONS:`,
      `- Keep the email under 250 words`,
      `- Open with a direct statement of purpose — who the student is and what they're proposing`,
      `- Include a brief personal introduction (1–2 sentences) using the student background above`,
      `- Pitch each idea with a short summary (no more than 3 sentences per idea)`,
      `- Close with a clear, low-friction ask (e.g., a 20-minute call)`,
      `- Professional but warm tone — not stiff or overly formal`,
      ``,
      `Respond with ONLY valid JSON, no markdown fences:`,
      `{"subject": "...", "body": "..."}`,
    ].filter(s => s !== undefined).join('\n')

    console.log('Step 6: calling Claude...')
    const rawText = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    console.log('Step 6: Claude responded, length:', rawText.length)

    // ── 7. Parse and return ───────────────────────────────────────────────────
    const cleanJson = cleanJsonResponse(rawText)

    let result: { subject: string; body: string }
    try {
      result = JSON.parse(cleanJson)
    } catch {
      console.error('Claude JSON parse failed. Raw:', rawText.slice(0, 300))
      return jsonResponse({ error: 'Email generation returned an unexpected response. Please try again.' }, 500)
    }

    if (!result.subject || !result.body) {
      return jsonResponse({ error: 'Email generation returned an incomplete response. Please try again.' }, 500)
    }

    console.log('Step 7: returning draft, subject:', result.subject.slice(0, 60))
    return jsonResponse({ subject: result.subject, body: result.body, draftsToday: (todayCount ?? 0) + 1 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-email-draft error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
