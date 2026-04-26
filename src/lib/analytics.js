import { supabase } from './supabase'

/**
 * Fire-and-forget product event. Never throws — failures are logged silently.
 * Call without await at event sites.
 */
export function trackEvent(eventName, properties = {}) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    supabase.from('product_events').insert({
      user_id: session.user.id,
      event_name: eventName,
      properties: Object.keys(properties).length > 0 ? properties : null,
    }).then(({ error }) => {
      if (error) console.warn('[analytics] trackEvent failed:', eventName, error.message)
    })
  })
}
