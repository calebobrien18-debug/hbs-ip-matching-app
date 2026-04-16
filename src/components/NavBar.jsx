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
      const { data: profile } = await supabase
        .from('hbs_ip')
        .select('first_name')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (profile?.first_name) {
        setDisplayName(profile.first_name)
      } else {
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
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors rounded-md px-3 py-1.5 ${
          active
            ? 'text-crimson bg-crimson/8'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200/80">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Left: logo */}
        <Link to="/dashboard" className="flex-shrink-0">
          <ProFoundLogo size="sm" />
        </Link>

        {/* Center: nav links */}
        <div className="flex items-center gap-1">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/faculty', 'Faculty')}
          {navLink('/match', 'Matching')}
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {displayName && (
            <span className="text-gray-400 text-sm hidden sm:block truncate max-w-[140px]">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

      </div>
    </nav>
  )
}
