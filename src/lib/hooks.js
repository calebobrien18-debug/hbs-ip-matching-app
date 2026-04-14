import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

/**
 * Redirects unauthenticated users to the landing page.
 * Returns the Supabase session once resolved, or null while the check is in flight.
 */
export function useRequireAuth() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/', { replace: true })
      else setSession(session)
    })
  }, [navigate])

  return session
}
