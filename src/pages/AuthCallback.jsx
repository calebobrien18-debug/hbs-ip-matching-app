import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      navigate('/', { replace: true })
      return
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (!error) trackEvent('session_started')
      navigate(error ? '/' : '/dashboard', { replace: true })
    })
  }, [navigate])

  return null
}
