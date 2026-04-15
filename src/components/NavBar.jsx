import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProFoundLogo from './ProFoundLogo'

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      // Prefer first_name from the student profile table
      const { data: profile } = await supabase
        .from('hbs_ip')
        .select('first_name')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (profile?.first_name) {
        setDisplayName(profile.first_name)
      } else {
        // Fallback for users who haven't completed their profile yet
        const meta = session.user.user_metadata
        const raw = meta?.full_name || meta?.name || session.user.email || ''
        setDisplayName(raw.includes('@') ? raw.split('@')[0] : raw.split(' ')[0])
      }
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const navLink = (to, label) => {
    const active = location.pathname === to ||
      (to === '/profile/new' && ['/profile/new', '/profile/edit'].includes(location.pathname))
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors pb-0.5 ${
          active
            ? 'text-crimson border-b-2 border-crimson'
            : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-30 w-full bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

        {/* Left: logo */}
        <Link to="/dashboard" className="flex-shrink-0">
          <ProFoundLogo size="sm" />
        </Link>

        {/* Center: nav links */}
        <div className="flex items-center gap-6">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/faculty', 'Faculty')}
          {navLink('/match', 'Matching')}
          {navLink('/profile/new', 'My Profile')}
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {displayName && (
            <span className="text-gray-500 text-sm hidden sm:block truncate max-w-[160px]">
              Hi, {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

      </div>
    </nav>
  )
}
