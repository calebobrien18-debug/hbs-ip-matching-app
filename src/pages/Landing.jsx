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

      {/* Baker Library silhouette */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <svg
          viewBox="0 0 1440 360"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
          className="w-full"
          aria-hidden="true"
        >
          {/* ── Main building masses ── */}
          <g fill="#1c0307" opacity="0.93">
            {/* Far left end */}
            <rect x="0"    y="282" width="178" height="78" />
            {/* Left main wing */}
            <rect x="178"  y="265" width="312" height="95" />
            {/* Left pavilion (stepped up) */}
            <rect x="490"  y="248" width="82"  height="112" />
            {/* Central block */}
            <rect x="572"  y="218" width="296" height="142" />
            {/* Right pavilion */}
            <rect x="868"  y="248" width="82"  height="112" />
            {/* Right main wing */}
            <rect x="950"  y="265" width="312" height="95" />
            {/* Far right end */}
            <rect x="1262" y="282" width="178" height="78" />
          </g>

          {/* ── Pediment — triangular gable crowning the central portico ── */}
          <polygon points="614,218 826,218 720,192" fill="#1c0307" opacity="0.93" />

          {/* ── Tower ── */}
          <g fill="#1c0307" opacity="0.96">
            {/* Square base shaft rising from central block roof */}
            <rect x="699" y="165" width="42" height="54" />
            {/* Belfry drum */}
            <rect x="701" y="128" width="38" height="38" />
            {/* Dome — bezier curves for the outward-convex cupola profile */}
            <path d="M 701,128 C 694,115 697,102 720,93 C 743,102 746,115 739,128 Z" />
            {/* Lantern */}
            <rect x="714" y="76" width="12" height="18" />
            {/* Spire */}
            <polygon points="720,42 713,76 727,76" />
          </g>

          {/* ── Belfry arched openings ── */}
          <g fill="#340610" opacity="0.85">
            <rect x="705" y="133" width="7" height="12" rx="3.5" />
            <rect x="716" y="133" width="7" height="12" rx="3.5" />
            <rect x="727" y="133" width="7" height="12" rx="3.5" />
          </g>

          {/* ── Window fenestration ── */}
          <g fill="#340610" opacity="0.65">
            {/* Left wing */}
            {[200,228,256,284,312,340,368,396,424,452].map(x => (
              <rect key={x} x={x} y="275" width="6" height="15" rx="3" />
            ))}
            {/* Right wing */}
            {[968,996,1024,1052,1080,1108,1136,1164,1192,1220].map(x => (
              <rect key={x} x={x} y="275" width="6" height="15" rx="3" />
            ))}
            {/* Central block — tall arched windows flanking the portico */}
            <rect x="590" y="232" width="8" height="22" rx="4" />
            <rect x="618" y="232" width="8" height="22" rx="4" />
            <rect x="814" y="232" width="8" height="22" rx="4" />
            <rect x="842" y="232" width="8" height="22" rx="4" />
            {/* Central arched entry */}
            <rect x="706" y="238" width="28" height="30" rx="14" />
          </g>

          {/* ── Roofline accent strokes ── */}
          <g stroke="#5c1020" strokeWidth="0.8" fill="none" opacity="0.4">
            <line x1="0"    y1="282" x2="178"  y2="282" />
            <line x1="178"  y1="265" x2="490"  y2="265" />
            <line x1="490"  y1="248" x2="572"  y2="248" />
            <line x1="572"  y1="218" x2="868"  y2="218" />
            <line x1="868"  y1="248" x2="950"  y2="248" />
            <line x1="950"  y1="265" x2="1262" y2="265" />
            <line x1="1262" y1="282" x2="1440" y2="282" />
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
