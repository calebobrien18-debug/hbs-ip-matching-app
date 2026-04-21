/**
 * Shared utilities for Supabase edge functions.
 * Import via: import { ... } from '../_shared/mod.ts'
 */

// ── CORS ──────────────────────────────────────────────────────────────────────

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Anthropic API ─────────────────────────────────────────────────────────────

/**
 * Calls the Anthropic Messages API via native fetch and returns the text
 * content of the first content block.
 */
export async function callClaude(params: {
  model: string
  max_tokens: number
  temperature: number
  system: string
  messages: Array<{ role: string; content: string }>
}): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
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

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content[0].text.trim()
}

// ── Auth / API key helpers ────────────────────────────────────────────────────

/**
 * Returns a 500 error Response if ANTHROPIC_API_KEY is not set, otherwise null.
 * Call at the top of each edge function handler before doing any work.
 */
export function checkAnthropicKey(): Response | null {
  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('ANTHROPIC_API_KEY is not set')
    return jsonResponse({ error: 'Server configuration error: Anthropic API key missing.' }, 500)
  }
  return null
}

/**
 * Extracts the Bearer token from the Authorization header, calls getUser, and
 * returns either the authenticated user or a ready-to-return 401 Response.
 *
 * Usage:
 *   const { user, errorResponse } = await requireAuth(req, supabase)
 *   if (errorResponse) return errorResponse
 */
export async function requireAuth(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
): Promise<{ user: { id: string; [key: string]: unknown } | null; errorResponse: Response | null }> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return { user: null, errorResponse: jsonResponse({ error: 'Unauthorized' }, 401) }
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
  if (authError || !user) {
    if (authError) console.error('Auth error:', authError.message)
    return { user: null, errorResponse: jsonResponse({ error: 'Unauthorized' }, 401) }
  }
  return { user, errorResponse: null }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Returns a Date set to the start of the current UTC day (00:00:00.000). */
export function getTodayStart(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Strips markdown code fences that Claude occasionally wraps JSON responses in.
 * e.g. ```json\n[...]\n``` → [...]
 */
export function cleanJsonResponse(rawText: string): string {
  return rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}
