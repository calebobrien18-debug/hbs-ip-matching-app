import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
      else setLoading(false)
    })
  }, [navigate])

  async function handleGitHubSignIn() {
    setSigningIn(true)
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (loading) return null

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* Deep crimson gradient sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 80%, #5c0a1a 0%, #2a0508 45%, #080104 100%)',
        }}
      />

      {/* Warm horizon glow behind the building */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 35% at 50% 100%, rgba(165,28,48,0.4) 0%, transparent 100%)',
        }}
      />

      {/* Baker Library silhouette
          Key proportions: very tall Georgian tower (4–5× wing height),
          long symmetrical wings, slight step-up to central block, no Greek pediment */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <svg
          viewBox="0 0 1440 340"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
          className="w-full"
          aria-hidden="true"
        >
          {/* ── Main building masses ─────────────────────────── */}
          <g fill="#1c0307" opacity="0.92">
            {/* Far left end section */}
            <rect x="0"    y="262" width="160" height="78" />
            {/* Left wing */}
            <rect x="160"  y="252" width="300" height="88" />
            {/* Left pavilion (slight step-up at junction) */}
            <rect x="460"  y="238" width="110" height="102" />
            {/* Central block */}
            <rect x="570"  y="220" width="300" height="120" />
            {/* Right pavilion */}
            <rect x="870"  y="238" width="110" height="102" />
            {/* Right wing */}
            <rect x="980"  y="252" width="300" height="88" />
            {/* Far right end section */}
            <rect x="1280" y="262" width="160" height="78" />
          </g>

          {/* ── Tower (the dominant feature of Baker Library) ── */}
          {/* Rising from center of the building, extremely tall */}
          <g fill="#1c0307" opacity="0.95">
            {/* Wide plinth where tower meets central roof */}
            <rect x="696" y="184" width="48" height="36" />
            {/* Main tower shaft */}
            <rect x="701" y="116" width="38" height="70" />
            {/* Belfry section — slightly wider to suggest louvered openings */}
            <rect x="699" y="84"  width="42" height="34" />
            {/* Octagonal lantern */}
            <rect x="704" y="60"  width="32" height="26" />
            {/* Spire finial cap */}
            <rect x="710" y="44"  width="20" height="18" />
            {/* Spire */}
            <polygon points="720,4 708,46 732,46" />
          </g>

          {/* ── Belfry openings (louvered arches on all 4 faces) ── */}
          {/* Slightly lighter to suggest open arched vents */}
          <g fill="#340610" opacity="0.9">
            <rect x="703" y="88"  width="8"  height="14" rx="4" />
            <rect x="714" y="88"  width="8"  height="14" rx="4" />
            <rect x="725" y="88"  width="8"  height="14" rx="4" />
          </g>

          {/* ── Window details on wings ─────────────────────── */}
          {/* Tall narrow windows suggesting Georgian fenestration */}
          <g fill="#340610" opacity="0.7">
            {/* Left wing windows */}
            <rect x="185"  y="263" width="6" height="16" rx="3" />
            <rect x="213"  y="263" width="6" height="16" rx="3" />
            <rect x="241"  y="263" width="6" height="16" rx="3" />
            <rect x="269"  y="263" width="6" height="16" rx="3" />
            <rect x="297"  y="263" width="6" height="16" rx="3" />
            <rect x="325"  y="263" width="6" height="16" rx="3" />
            <rect x="353"  y="263" width="6" height="16" rx="3" />
            <rect x="381"  y="263" width="6" height="16" rx="3" />
            <rect x="409"  y="263" width="6" height="16" rx="3" />
            {/* Right wing windows */}
            <rect x="1005" y="263" width="6" height="16" rx="3" />
            <rect x="1033" y="263" width="6" height="16" rx="3" />
            <rect x="1061" y="263" width="6" height="16" rx="3" />
            <rect x="1089" y="263" width="6" height="16" rx="3" />
            <rect x="1117" y="263" width="6" height="16" rx="3" />
            <rect x="1145" y="263" width="6" height="16" rx="3" />
            <rect x="1173" y="263" width="6" height="16" rx="3" />
            <rect x="1201" y="263" width="6" height="16" rx="3" />
            <rect x="1229" y="263" width="6" height="16" rx="3" />
            {/* Central block upper windows */}
            <rect x="590"  y="232" width="7" height="18" rx="3" />
            <rect x="618"  y="232" width="7" height="18" rx="3" />
            <rect x="646"  y="232" width="7" height="18" rx="3" />
            <rect x="760"  y="232" width="7" height="18" rx="3" />
            <rect x="788"  y="232" width="7" height="18" rx="3" />
            <rect x="816"  y="232" width="7" height="18" rx="3" />
          </g>

          {/* ── Roofline accent strokes ──────────────────────── */}
          <g stroke="#5c1020" strokeWidth="0.8" fill="none" opacity="0.45">
            <line x1="0"    y1="262" x2="160"  y2="262" />
            <line x1="160"  y1="252" x2="460"  y2="252" />
            <line x1="460"  y1="238" x2="570"  y2="238" />
            <line x1="570"  y1="220" x2="870"  y2="220" />
            <line x1="870"  y1="238" x2="980"  y2="238" />
            <line x1="980"  y1="252" x2="1280" y2="252" />
            <line x1="1280" y1="262" x2="1440" y2="262" />
          </g>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xl w-full text-center px-6 space-y-7">
        <div className="space-y-4">
          <h1 className="text-7xl font-bold tracking-tight text-white drop-shadow-lg">
            ProfFound
          </h1>
          <p className="text-xl font-medium tracking-wide" style={{ color: '#e87088' }}>
            Find faculty who share your passions.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#c49aa4' }}>
            Great research starts with the right team. Turn common interests
            into independent projects, case writing collaborations, and lifelong
            relationships.
          </p>
        </div>

        <button
          onClick={handleGitHubSignIn}
          disabled={signingIn}
          className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 font-semibold px-7 py-3 rounded-lg shadow-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          style={{ color: '#A51C30' }}
        >
          <GitHubIcon />
          {signingIn ? 'Redirecting…' : 'Sign in with GitHub'}
        </button>
      </div>

    </div>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
