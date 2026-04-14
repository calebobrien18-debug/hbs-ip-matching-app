import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProfFoundLogo from './ProfFoundLogo'

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
            ? 'text-white border-b-2 border-white'
            : 'text-white/70 hover:text-white border-b-2 border-transparent'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-30 w-full" style={{ backgroundColor: '#A51C30' }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

        {/* Left: logo mark + wordmark */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <ProfFoundLogo size={30} color="#ffffff" />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-base tracking-tight">ProfFound</span>
            <span className="text-white/60 text-[10px] uppercase tracking-widest font-medium">
              Harvard Business School
            </span>
          </div>
        </div>

        {/* Center: nav links */}
        <div className="flex items-center gap-6">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/faculty', 'Faculty')}
          {navLink('/profile/new', 'My Profile')}
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {displayName && (
            <span className="text-white/80 text-sm hidden sm:block truncate max-w-[160px]">
              Hi, {displayName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-white/70 hover:text-white border border-white/30 hover:border-white/60 rounded-md px-3 py-1.5 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

      </div>
    </nav>
  )
}
