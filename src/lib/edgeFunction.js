import { supabase } from './supabase'

/**
 * Invokes a Supabase edge function with a fresh session token.
 *
 * Handles the repetitive pattern of:
 *   1. Fetching the current session
 *   2. Syncing the token to supabase.functions
 *   3. Invoking the function
 *   4. Extracting the real error message from the raw response body
 *
 * @param {string} fnName       - Edge function name (e.g. 'generate-matches')
 * @param {object} [body]       - JSON body to send
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<object>} Resolved data from the function
 * @throws {Error} With the server-provided message when available
 *         AbortError is re-thrown as-is so callers can detect cancellation.
 */
export async function invokeEdgeFunction(fnName, body, signal) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No active session — please sign in again.')
  supabase.functions.setAuth(session.access_token)

  const invokeOptions = {
    ...(body   ? { body }   : {}),
    ...(signal ? { signal } : {}),
  }

  const { data, error, response } = await supabase.functions.invoke(
    fnName,
    Object.keys(invokeOptions).length ? invokeOptions : undefined
  )

  if (error) {
    // Re-throw abort errors immediately — don't try to parse the response
    if (error.name === 'AbortError' || signal?.aborted) {
      const abortErr = new Error('AbortError')
      abortErr.name = 'AbortError'
      throw abortErr
    }
    let message = error.message
    try {
      const rawResponse = response ?? error.context
      if (rawResponse) {
        const parsed = await rawResponse.json()
        if (parsed?.error) message = parsed.error
      }
    } catch { /* fall back to generic message */ }
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)
  return data
}
