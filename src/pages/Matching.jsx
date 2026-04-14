import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth, useSavedFaculty } from '../lib/hooks'
import { initials } from '../lib/utils'

const LOADING_MESSAGES = [
  'Analyzing your background…',
  'Scanning faculty research areas…',
  'Reviewing publications and courses…',
  'Selecting your best matches…',
]

// Chip colors — three shades of green
const STRENGTH_STYLES = {
  strong:      'bg-green-700 text-white',
  good:        'bg-green-100 text-green-800 border border-green-300',
  exploratory: 'bg-green-50 text-green-600 border border-green-200',
}

// Left-border accent on cards
const STRENGTH_ACCENT = {
  strong:      'border-l-green-600',
  good:        'border-l-green-400',
  exploratory: 'border-l-green-200',
}

// Active filter pill colors mirror the chip colors
const STRENGTH_FILTER_ACTIVE = {
  strong:      'bg-green-700 text-white border-green-700',
  good:        'bg-green-100 text-green-800 border-green-300',
  exploratory: 'bg-green-50 text-green-600 border-green-200',
}

const STRENGTH_LABELS = {
  strong:      'Strong match',
  good:        'Good match',
  exploratory: 'Exploratory',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function Matching() {
  const session = useRequireAuth()
  const navigate = useNavigate()
  const { savedIds, toggleSave } = useSavedFaculty(session)

  const [pageState, setPageState] = useState('loading')  // loading | no-profile | ready | running | results
  const [profile, setProfile] = useState(null)
  const [runs, setRuns] = useState([])                   // all runs for this user, newest first
  const [matches, setMatches] = useState([])             // current displayed matches
  const [selectedRunId, setSelectedRunId] = useState(null)  // null = latest
  const [runError, setRunError] = useState(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [filterStrength, setFilterStrength] = useState(null)  // null = all

  // Load profile + run history on mount
  useEffect(() => {
    if (!session) return
    async function load() {
      const [{ data: profileData }, { data: runData }] = await Promise.all([
        supabase.from('hbs_ip')
          .select('professional_interests, resume_text, linkedin_text, program, graduation_year')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase.from('match_runs')
          .select('id, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
      ])

      setProfile(profileData)

      if (!profileData) { setPageState('no-profile'); return }

      const allRuns = runData ?? []
      setRuns(allRuns)

      if (allRuns.length > 0) {
        await loadMatchesForRun(allRuns[0].id)
        setPageState('results')
      } else {
        setPageState('ready')
      }
    }
    load()
  }, [session])

  // Load messages cycling animation while running
  useEffect(() => {
    if (pageState !== 'running') return
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [pageState])

  const loadMatchesForRun = useCallback(async (runId) => {
    const { data } = await supabase
      .from('faculty_matches')
      .select('*, faculty(id, name, unit, image_url, title, bio)')
      .eq('run_id', runId)
      .order('rank')
    setMatches(data ?? [])
    setSelectedRunId(runId)
    setFilterStrength(null)
  }, [])

  async function handleMatch() {
    setRunError(null)
    setMsgIndex(0)
    setPageState('running')

    try {
      // Explicitly sync the session token to the functions client before invoking.
      // supabase.functions.setAuth() updates the Authorization header that
      // functions.invoke() uses — this prevents stale-token / timing issues.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session — please sign in again.')
      supabase.functions.setAuth(session.access_token)

      const { data, error, response } = await supabase.functions.invoke('generate-matches')

      if (error) {
        // Extract the real error message from the response body
        let message = error.message
        try {
          // supabase-js returns `response` (the raw Response) alongside the error
          const rawResponse = response ?? error.context
          if (rawResponse) {
            const body = await rawResponse.json()
            if (body?.error) message = body.error
          }
        } catch { /* fall back to generic message */ }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)

      // Reload run list and show fresh results
      const { data: runData } = await supabase
        .from('match_runs')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setRuns(runData ?? [])
      setMatches(data.matches ?? [])
      setSelectedRunId(data.run_id)
      setPageState('results')
    } catch (err) {
      console.error('Matching error:', err)
      setRunError(err.message || 'Something went wrong. Please try again.')
      setPageState(runs.length > 0 ? 'results' : 'ready')
    }
  }

  async function handleSelectRun(runId) {
    await loadMatchesForRun(runId)
    setArchiveOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const latestRunId = runs[0]?.id ?? null
  const isViewingLatest = selectedRunId === latestRunId
  const archivedRuns = runs.slice(1)  // all but the newest

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pageState === 'loading') return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    </div>
  )

  if (pageState === 'no-profile') return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
          <SparklesIcon className="w-7 h-7 text-crimson" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Create a profile first</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          The matching tool draws on your professional background, interests, and uploaded documents to find your best faculty matches.
        </p>
        <Link to="/profile/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-crimson text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          Create your profile →
        </Link>
      </div>
    </div>
  )

  if (pageState === 'running') return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
          <div className="w-8 h-8 rounded-full border-[3px] border-crimson/20 border-t-crimson animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Finding your matches</h2>
          <p className="text-sm text-gray-500 mt-2 h-5 transition-all">{LOADING_MESSAGES[msgIndex]}</p>
        </div>
        <p className="text-xs text-gray-400">This typically takes 15–30 seconds</p>
      </div>
    </div>
  )

  // ── State: ready (no runs yet) ─────────────────────────────────────────────
  if (pageState === 'ready') return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
            <SparklesIcon className="w-7 h-7 text-crimson" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">Find Your Faculty Match</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Our AI reviews your professional background against every HBS faculty member's research,
            publications, and courses — then surfaces the thought partners most relevant to your goals.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">How it works</h2>
          <div className="space-y-4">
            {[
              { n: '1', title: 'We analyze your profile', body: 'Your stated interests, additional background, and uploaded resume and LinkedIn PDF are all used as inputs.' },
              { n: '2', title: 'We scan faculty research', body: "Every HBS faculty member's research areas, publications, case studies, and courses are compared against your background." },
              { n: '3', title: 'We surface your best matches', body: 'You receive 2–10 ranked faculty matches with specific reasoning and concrete suggestions for how to work together.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-crimson text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile completeness nudge */}
        {!profile?.professional_interests && !profile?.resume_text && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
            <span className="flex-shrink-0">⚠</span>
            <span>
              Your profile has no professional interests or uploaded resume yet.{' '}
              <Link to="/profile/edit" className="font-semibold underline underline-offset-2">
                Fill in your profile
              </Link>{' '}
              for the best results.
            </span>
          </div>
        )}

        {runError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{runError}</div>
        )}

        <button
          type="button"
          onClick={handleMatch}
          className="w-full py-3.5 rounded-xl bg-crimson text-white font-semibold text-base cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <SparklesIcon className="w-5 h-5" />
          Match Me
        </button>
      </div>
    </div>
  )

  // ── State: results ─────────────────────────────────────────────────────────
  const displayedRun = runs.find(r => r.id === selectedRunId)

  const strongCount      = matches.filter(m => m.match_strength === 'strong').length
  const goodCount        = matches.filter(m => m.match_strength === 'good').length
  const exploratoryCount = matches.filter(m => m.match_strength === 'exploratory').length

  const filteredMatches = filterStrength
    ? matches.filter(m => m.match_strength === filterStrength)
    : matches

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isViewingLatest ? 'Your Faculty Matches' : 'Past Match Results'}
            </h1>
            {displayedRun && (
              <p className="text-sm text-gray-400 mt-1">
                {isViewingLatest ? 'Generated' : 'From'} {formatDate(displayedRun.created_at)}
              </p>
            )}
          </div>
          {isViewingLatest && (
            <button
              type="button"
              onClick={handleMatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-crimson text-crimson text-sm font-semibold hover:bg-crimson/6 transition-colors cursor-pointer flex-shrink-0"
            >
              <RefreshIcon className="w-4 h-4" />
              Re-run
            </button>
          )}
          {!isViewingLatest && (
            <button
              type="button"
              onClick={() => handleSelectRun(latestRunId)}
              className="text-sm font-medium text-crimson hover:opacity-70 transition-opacity cursor-pointer"
            >
              ← Back to latest
            </button>
          )}
        </div>

        {runError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{runError}</div>
        )}

        {/* Encouraging summary banner */}
        {isViewingLatest && matches.length > 0 && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                {matches.length} faculty match{matches.length !== 1 ? 'es' : ''} found
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                {strongCount > 0
                  ? `You have ${strongCount} strong match${strongCount > 1 ? 'es' : ''} — these are your best starting points for outreach. Scroll down to explore all your results.`
                  : 'These faculty are well-aligned with your background and professional interests. Explore each profile to find your best starting point.'}
              </p>
            </div>
          </div>
        )}

        {/* Profile completeness nudge */}
        {!profile?.professional_interests && !profile?.resume_text && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
            <span className="flex-shrink-0">⚠</span>
            <span>
              Your profile lacks professional interests and a resume.{' '}
              <Link to="/profile/edit" className="font-semibold underline underline-offset-2">Update your profile</Link>{' '}
              and re-run for better results.
            </span>
          </div>
        )}

        {/* Strength filter pills */}
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterStrength(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                filterStrength === null
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              All ({matches.length})
            </button>
            {[
              { key: 'strong',      label: 'Strong',      count: strongCount },
              { key: 'good',        label: 'Good',        count: goodCount },
              { key: 'exploratory', label: 'Exploratory', count: exploratoryCount },
            ].filter(({ count }) => count > 0).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStrength(filterStrength === key ? null : key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  filterStrength === key
                    ? STRENGTH_FILTER_ACTIVE[key]
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}

        {/* Match cards */}
        <div className="space-y-4">
          {filteredMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isSaved={savedIds.has(match.faculty?.id)}
              onSaveToggle={() => toggleSave(match.faculty?.id)}
            />
          ))}
          {filteredMatches.length === 0 && filterStrength && (
            <p className="text-sm text-gray-500 text-center py-8">
              No {STRENGTH_LABELS[filterStrength].toLowerCase()} matches in this run.
            </p>
          )}
        </div>

        {/* Archive */}
        {archivedRuns.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setArchiveOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <ChevronIcon className={`w-4 h-4 transition-transform ${archiveOpen ? 'rotate-180' : ''}`} />
              Previous runs ({archivedRuns.length})
            </button>

            {archiveOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {archivedRuns.map(run => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => handleSelectRun(run.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      selectedRunId === run.id
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {formatDate(run.created_at)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Match card ─────────────────────────────────────────────────────────────────

function MatchCard({ match, isSaved, onSaveToggle }) {
  const f = match.faculty
  if (!f) return null

  const strengthStyle = STRENGTH_STYLES[match.match_strength] ?? STRENGTH_STYLES.good
  const strengthLabel = STRENGTH_LABELS[match.match_strength] ?? 'Match'

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${STRENGTH_ACCENT[match.match_strength] ?? STRENGTH_ACCENT.good} p-6 space-y-5`}>

      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {f.image_url ? (
          <img src={f.image_url} alt={f.name}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0 bg-gray-100" />
        ) : (
          <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold bg-crimson">
            {initials(f.name)}
          </div>
        )}

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-snug">{f.name}</h3>
              {f.title && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.title}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {f.unit && (
                <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 text-white bg-crimson">
                  {f.unit}
                </span>
              )}
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${strengthStyle}`}>
                {strengthLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        {/* Match reasons */}
        {match.match_reasons?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why you match</p>
            <ul className="space-y-1.5">
              {match.match_reasons.map((reason, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                  <span className="text-crimson font-bold flex-shrink-0 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collaboration ideas */}
        {match.collaboration_ideas?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ways to collaborate</p>
            <ul className="space-y-1.5">
              {match.collaboration_ideas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                  <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">→</span>
                  {idea}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="relative group/save-tip">
          <button
            type="button"
            onClick={onSaveToggle}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isSaved
                ? 'text-crimson bg-crimson/6'
                : 'text-gray-400 hover:text-crimson hover:bg-crimson/6'
            }`}
          >
            <BookmarkIcon filled={isSaved} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <div className="absolute left-0 top-full mt-1 w-52 rounded-lg bg-gray-800 text-white text-xs
                          px-2.5 py-2 opacity-0 group-hover/save-tip:opacity-100 transition-opacity
                          pointer-events-none z-10 leading-snug shadow-lg">
            {isSaved ? 'Remove from saved faculty' : 'Save to Dashboard — appears in My Saved Faculty'}
          </div>
        </div>

        <Link
          to={`/faculty/${f.id}`}
          className="text-sm font-semibold text-crimson hover:opacity-70 transition-opacity"
        >
          View full profile →
        </Link>
      </div>
    </div>
  )
}

// ── Icon components ────────────────────────────────────────────────────────────

function SparklesIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z" clipRule="evenodd" />
    </svg>
  )
}

function RefreshIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}
