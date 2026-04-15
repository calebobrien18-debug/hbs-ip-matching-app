import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProFoundLogo from '../components/ProFoundLogo'
import Footer from '../components/Footer'

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
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center space-y-7">

          {/* Logo — large */}
          <div className="flex justify-center">
            <ProFoundLogo size="lg" />
          </div>

          {/* Tagline + description */}
          <div className="space-y-3">
            <p className="text-xl font-semibold text-crimson tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Find faculty who share your passions.
            </p>
            <p className="text-base leading-relaxed text-gray-500 max-w-md mx-auto">
              Great research starts with the right team. Turn shared interests
              into independent projects, case writing collaborations, and lifelong
              relationships.
            </p>
          </div>

          {/* Sign-in button */}
          <div>
            <button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={signingIn}
              className="inline-flex items-center gap-3 bg-crimson hover:bg-crimson-dark disabled:opacity-50 font-semibold px-7 py-3 rounded-lg shadow-md transition-colors cursor-pointer disabled:cursor-not-allowed text-white"
            >
              <GitHubIcon />
              {signingIn ? 'Redirecting…' : 'Sign in with GitHub'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Footer — copyright only ── */}
      <Footer showFeedback={false} />

    </div>
  )
}

// ── GitHub icon ────────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
