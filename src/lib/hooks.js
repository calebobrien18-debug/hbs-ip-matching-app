import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

/**
 * Returns true if the current user is in the admins table, false if not,
 * and null while the check is still in flight.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setIsAdmin(false); return }
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      setIsAdmin(!!data)
    })
  }, [])

  return isAdmin
}

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

/**
 * Loads the current user's saved faculty IDs and provides a toggle function.
 * Uses optimistic updates — local state changes immediately, DB call follows.
 *
 * Usage:
 *   const { savedIds, toggleSave } = useSavedFaculty(session)
 *   savedIds.has(facultyId)   // boolean
 *   toggleSave(facultyId)     // async, no return value needed
 */
export function useSavedFaculty(session) {
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_faculty')
      .select('faculty_id')
      .eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (error) { console.error('[useSavedFaculty] load error:', error); return }
        setSavedIds(new Set((data ?? []).map(r => r.faculty_id)))
      })
  }, [session])

  async function toggleSave(facultyId) {
    if (!session) return
    const isSaved = savedIds.has(facultyId)

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(facultyId) : next.add(facultyId)
      return next
    })

    if (isSaved) {
      const { error } = await supabase
        .from('saved_faculty')
        .delete()
        .eq('user_id', session.user.id)
        .eq('faculty_id', facultyId)
      if (error) console.error('[useSavedFaculty] delete error:', error)
    } else {
      const { error } = await supabase
        .from('saved_faculty')
        .insert({ user_id: session.user.id, faculty_id: facultyId })
      if (error) {
        console.error('[useSavedFaculty] insert error:', error)
        // Roll back the optimistic update if the insert failed
        setSavedIds(prev => { const next = new Set(prev); next.delete(facultyId); return next })
      }
    }
  }

  return { savedIds, toggleSave }
}
