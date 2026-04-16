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
