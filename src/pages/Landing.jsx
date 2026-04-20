import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SearchIcon, SparklesIcon, LightbulbIcon } from '../components/Icons'
import ProFoundLogo from '../components/ProFoundLogo'

const FEATURES = [
  {
    Icon: SearchIcon,
    label: 'Browse Faculty',
    description: 'Explore all HBS professors by research area, course, and publication history.',
  },
  {
    Icon: SparklesIcon,
    label: 'AI Matching',
    description: 'Get ranked faculty matches tailored to your background and interests.',
  },
  {
    Icon: LightbulbIcon,
    label: 'Case Study Ideas',
    description: 'Generate case writing pitches and draft outreach emails for each match.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  // Email/password form state
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
      else setLoading(false)
    })
  }, [navigate])

  async function handleGoogleSignIn() {
    setSigningIn(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleEmailAuth(e) {
    e.preventDefault()
    setAuthError(null)
    setSubmitting(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
      else setSignupSuccess(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
      else navigate('/dashboard', { replace: true })
    }

    setSubmitting(false)
  }

  function switchMode(newMode) {
    setMode(newMode)
    setAuthError(null)
    setSignupSuccess(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row animate-fade-in">

      {/* ── Left panel: brand ── */}
      <div className="hidden lg:flex lg:w-[58%] bg-crimson relative overflow-hidden flex-col p-14 text-white">

        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Soft vignette to ground the content */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 30% 60%, rgba(0,0,0,0.18) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col h-full">

          {/* Main copy — vertically centred */}
          <div className="flex-1 flex flex-col justify-center space-y-8 py-12">

            {/* Wordmark — the focal point */}
            <div>
              <ProFoundLogo size="lg" light />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-white leading-snug">
                Find faculty who share your passions.
              </h1>
              <p className="text-sm text-white/65 leading-relaxed max-w-sm">
                Turn shared interests into independent projects, case writing partnerships, and lasting faculty relationships.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-5 pt-2">
              {FEATURES.map(({ Icon, label, description }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Beta badge */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center text-[11px] font-medium text-white/40 bg-white/8 rounded-full px-3 py-1 tracking-wide uppercase">
              Beta
            </span>
          </div>

        </div>
      </div>

      {/* ── Right panel: auth ── */}
      <div className="w-full lg:w-[42%] flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 py-16">

        {/* Mobile-only: logo + headline */}
        <div className="lg:hidden w-full max-w-sm mb-8 text-center space-y-3">
          <img src="/profound-logo.svg" alt="ProFound" className="h-14 mx-auto" />
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Find faculty who share your passions.
          </h1>
          <p className="text-sm text-gray-500">
            Turn shared interests into independent projects, case writing partnerships, and lasting faculty relationships.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">

          {/* Heading (desktop only) */}
          <div className="hidden lg:block mb-2">
            <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-400 mt-0.5">Sign in to your account to continue.</p>
          </div>

          {/* Auth card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">

            {/* Google — primary CTA */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-crimson hover:bg-crimson-dark disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed text-sm"
            >
              <GoogleIcon />
              {signingIn ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Email/password — secondary */}
            {signupSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                <p className="font-semibold mb-1">Check your inbox</p>
                <p className="text-green-700">
                  We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to activate your account, then sign in.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-2.5">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crimson/25 focus:border-crimson transition bg-gray-50/50"
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crimson/25 focus:border-crimson transition bg-gray-50/50"
                />

                {authError && (
                  <p className="text-xs text-red-600 px-1 pt-0.5">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed text-sm"
                >
                  {submitting
                    ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                    : (mode === 'signup' ? 'Create account' : 'Sign in')}
                </button>

                <p className="text-center text-xs text-gray-400 pt-0.5">
                  {mode === 'signin' ? (
                    <>No account?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="text-crimson font-medium hover:underline cursor-pointer">
                        Create one
                      </button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <button type="button" onClick={() => switchMode('signin')} className="text-crimson font-medium hover:underline cursor-pointer">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
          </div>

          {/* Mobile feature strip */}
          <div className="lg:hidden pt-6 space-y-3">
            {FEATURES.map(({ Icon, label, description }) => (
              <div key={label} className="flex items-start gap-3 px-1">
                <div className="w-7 h-7 rounded-lg bg-crimson/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-crimson" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-gray-300 pt-2">
            © {new Date().getFullYear()} ProFound, LLC. All rights reserved.
          </p>

        </div>
      </div>

    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
