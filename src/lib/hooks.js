import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { trackEvent } from './analytics'

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
 * Subscribes to auth state changes so sign-outs propagate without a page reload.
 */
export function useRequireAuth() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) navigate('/', { replace: true })
      else setSession(s)
    })

    // Subscribe to future auth changes (e.g. sign-out in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) navigate('/', { replace: true })
      else setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return session
}

// ── Generic saved-items hook ──────────────────────────────────────────────────

/**
 * Internal generic hook for saved-item sets backed by a Supabase table.
 * Handles load, optimistic toggle, and rollback for both insert and delete failures.
 *
 * @param {string} tableName  - e.g. 'saved_faculty'
 * @param {string} fieldKey   - the ID column name, e.g. 'faculty_id'
 * @param {object|null} session - Supabase session from useRequireAuth
 */
function useSavedItems(tableName, fieldKey, session) {
  const [ids, setIds] = useState(new Set())

  useEffect(() => {
    if (!session) return
    supabase
      .from(tableName)
      .select(fieldKey)
      .eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (error) { console.error(`[${tableName}] load error:`, error); return }
        setIds(new Set((data ?? []).map(r => r[fieldKey])))
      })
  }, [session, tableName, fieldKey])

  async function toggle(itemId) {
    if (!session) return

    // Determine current state from the latest set to avoid stale-closure bugs
    setIds(prev => {
      const next = new Set(prev)
      if (prev.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

    // Re-read the current saved state to decide which DB op to run
    // We use a local snapshot before the optimistic update for the decision
    const { data: existing } = await supabase
      .from(tableName)
      .select(fieldKey)
      .eq('user_id', session.user.id)
      .eq(fieldKey, itemId)
      .maybeSingle()

    const wasSaved = !!existing

    if (wasSaved) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', session.user.id)
        .eq(fieldKey, itemId)
      if (error) {
        console.error(`[${tableName}] delete error:`, error)
        // Rollback: restore the item
        setIds(prev => { const next = new Set(prev); next.add(itemId); return next })
      }
    } else {
      const { error } = await supabase
        .from(tableName)
        .insert({ user_id: session.user.id, [fieldKey]: itemId })
      if (error) {
        console.error(`[${tableName}] insert error:`, error)
        // Rollback: remove the item
        setIds(prev => { const next = new Set(prev); next.delete(itemId); return next })
      } else if (tableName === 'saved_faculty') {
        trackEvent('faculty_saved')
      }
    }
  }

  return { ids, toggle }
}

// ── Public wrappers ───────────────────────────────────────────────────────────

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
  const { ids: savedIds, toggle: toggleSave } = useSavedItems('saved_faculty', 'faculty_id', session)

  // status map: facultyId → status string
  const [statusMap, setStatusMap] = useState(new Map())

  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_faculty')
      .select('faculty_id, status')
      .eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (error) { console.error('[useSavedFaculty] status load error:', error); return }
        setStatusMap(new Map((data ?? []).map(r => [r.faculty_id, r.status ?? 'interested'])))
      })
  }, [session])

  async function updateStatus(facultyId, status) {
    // Optimistic
    setStatusMap(prev => new Map(prev).set(facultyId, status))
    const { error } = await supabase
      .from('saved_faculty')
      .update({ status })
      .eq('user_id', session.user.id)
      .eq('faculty_id', facultyId)
    if (error) {
      console.error('[useSavedFaculty] status update error:', error)
      // Rollback to previous value
      setStatusMap(prev => {
        const next = new Map(prev)
        next.delete(facultyId)
        return next
      })
    }
  }

  return { savedIds, toggleSave, statusMap, updateStatus }
}

/**
 * Loads the current user's saved course IDs and provides a toggle function.
 * Mirrors useSavedFaculty — uses optimistic updates.
 *
 * Usage:
 *   const { savedCourseIds, toggleSaveCourse } = useSavedCourses(session)
 *   savedCourseIds.has(courseId)   // boolean
 *   toggleSaveCourse(courseId)     // async
 */
export function useSavedCourses(session) {
  const { ids: savedCourseIds, toggle: toggleSaveCourse } = useSavedItems('saved_courses', 'course_id', session)
  return { savedCourseIds, toggleSaveCourse }
}

export function useFilterFade(dep) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 150)
    return () => clearTimeout(t)
  }, [dep])
  return visible
}
