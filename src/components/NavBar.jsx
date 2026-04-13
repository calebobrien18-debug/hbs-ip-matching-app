import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const meta = session.user.user_metadata
      setDisplayName(meta?.full_name || meta?.name || session.user.email || '')
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

        {/* Left: crest + wordmark */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <HBSCrest />
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
          {navLink('/profile/new', 'Add Profile')}
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {displayName && (
            <span className="text-white/80 text-sm hidden sm:block truncate max-w-[160px]">
              {displayName}
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

function HBSCrest() {
  return (
    <svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield outline */}
      <path
        d="M14 1L2 5.5V17C2 23.5 7.5 29.5 14 31C20.5 29.5 26 23.5 26 17V5.5L14 1Z"
        fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.6" strokeWidth="1.2"
      />
      {/* Horizontal bar */}
      <line x1="5" y1="15" x2="23" y2="15" stroke="white" strokeOpacity="0.7" strokeWidth="1.2" />
      {/* Vertical bar */}
      <line x1="14" y1="6" x2="14" y2="27" stroke="white" strokeOpacity="0.7" strokeWidth="1.2" />
    </svg>
  )
}
