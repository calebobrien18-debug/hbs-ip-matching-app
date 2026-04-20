import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth, useSavedCourses } from '../lib/hooks'
import { COURSE_DAILY_LIMIT as DAILY_LIMIT, STRENGTH_STYLES, STRENGTH_ACCENT, STRENGTH_LABELS } from '../lib/constants'
import {
  SparklesIcon, RefreshIcon, ChevronIcon, BookmarkIcon, BookOpenIcon,
} from '../components/Icons'
import { invokeEdgeFunction } from '../lib/edgeFunction'

const LOADING_MESSAGES = [
  'Reviewing your profile…',
  'Scanning 2026–27 electives…',
  'Matching interests to courses…',
  'Finding your best picks…',
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function CourseMatch() {
  const session = useRequireAuth()
  const { savedCourseIds, toggleSaveCourse } = useSavedCourses(session)

  const [pageState, setPageState] = useState('loading')   // loading | no-profile | ready | running | results
  const [profile, setProfile] = useState(null)
  const [runs, setRuns] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [runError, setRunError] = useState(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [runsToday, setRunsToday] = useState(0)
  const [electiveInterests, setElectiveInterests] = useState('')
  const [strengthFilter, setStrengthFilter] = useState(null)
  const abortControllerRef = useRef(null)                // for cancelling in-flight requests

  // "How it works" — open by default on first visit, collapsed thereafter
  const LS_KEY_HOWTO = 'profound_howto_courses'
  const [howToOpen, setHowToOpen] = useState(() => !localStorage.getItem(LS_KEY_HOWTO))
  useEffect(() => { localStorage.setItem(LS_KEY_HOWTO, '1') }, [])

  // Set of faculty_ids the user has matched (for badge display)
  const [matchedFacultyIds, setMatchedFacultyIds] = useState(new Set())

  // Load profile + run history + matched faculty on mount
  useEffect(() => {
    if (!session) return
    async function load() {
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)

      const [
        { data: profileData },
        { data: runData },
        { count: todayCount },
        { data: facultyMatchData },
      ] = await Promise.all([
        supabase.from('hbs_ip')
          .select('professional_interests, resume_text, linkedin_text, program, graduation_year')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase.from('course_match_runs')
          .select('id, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('course_match_runs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('created_at', todayStart.toISOString()),
        // Load all faculty_ids from this user's faculty matches (for badge display)
        supabase.from('faculty_matches')
          .select('faculty_id, match_runs!inner(user_id)')
          .eq('match_runs.user_id', session.user.id),
      ])

      setRunsToday(todayCount ?? 0)
      setProfile(profileData)

      // Build matched faculty set
      if (facultyMatchData) {
        setMatchedFacultyIds(new Set(facultyMatchData.map(r => r.faculty_id).filter(Boolean)))
      }

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

  // Cycle loading messages
  useEffect(() => {
    if (pageState !== 'running') return
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [pageState])

  const loadMatchesForRun = useCallback(async (runId) => {
    const { data } = await supabase
      .from('course_matches')
      .select('*, faculty_courses(id, course_title, course_number, faculty_name, faculty_id, unit, term, quarter, credits, description)')
      .eq('run_id', runId)
      .order('rank')
    setMatches(data ?? [])
    setSelectedRunId(runId)
  }, [])

  async function handleRun() {
    setRunError(null)
    setMsgIndex(0)
    abortControllerRef.current = new AbortController()
    setPageState('running')

    try {
      const data = await invokeEdgeFunction(
        'generate-course-matches',
        electiveInterests ? { elective_interests: electiveInterests } : undefined,
        abortControllerRef.current.signal
      )

      const { data: runData } = await supabase
        .from('course_match_runs')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setRuns(runData ?? [])
      setMatches(data.matches ?? [])
      setSelectedRunId(data.run_id)
      setRunsToday(prev => prev + 1)
      setStrengthFilter(null)
      setPageState('results')
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled — silently restore previous state, no error shown
        setPageState(runs.length > 0 ? 'results' : 'ready')
        return
      }
      console.error('Course match error:', err)
      setRunError(err.message || 'Something went wrong. Please try again.')
      setPageState(runs.length > 0 ? 'results' : 'ready')
    } finally {
      abortControllerRef.current = null
    }
  }

  function handleCancelRun() {
    abortControllerRef.current?.abort()
  }

  async function handleSelectRun(runId) {
    setStrengthFilter(null)
    await loadMatchesForRun(runId)
    setArchiveOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleRemoveCourse(matchId) {
    setMatches(prev => prev.filter(m => m.id !== matchId))
    const { error } = await supabase.from('course_matches').delete().eq('id', matchId)
    if (error) {
      console.error('Remove course error:', error)
      await loadMatchesForRun(selectedRunId)
    }
  }

  const latestRunId = runs[0]?.id ?? null
  const isViewingLatest = selectedRunId === latestRunId
  const archivedRuns = runs.slice(1)
  const strongCount = matches.filter(m => m.match_strength === 'strong').length
  const visibleMatches = strengthFilter
    ? matches.filter(m => m.match_strength === strengthFilter)
    : matches

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === 'loading') return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    </div>
  )

  if (pageState === 'no-profile') return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
          <SparklesIcon className="w-7 h-7 text-crimson" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Create a profile first</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          The course matching tool uses your professional background and interests to find your best elective fits.
        </p>
        <Link to="/profile/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-crimson text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          Create your profile →
        </Link>
      </div>
    </div>
  )

  if (pageState === 'running') return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
          <div className="w-8 h-8 rounded-full border-[3px] border-crimson/20 border-t-crimson animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Finding your courses</h2>
          <p className="text-sm text-gray-500 mt-2 h-5 transition-all">{LOADING_MESSAGES[msgIndex]}</p>
        </div>
        <p className="text-xs text-gray-400">This typically takes 15–30 seconds</p>
        <button
          type="button"
          onClick={handleCancelRun}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // ── State: ready ──────────────────────────────────────────────────────────
  if (pageState === 'ready') return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-crimson/8 flex items-center justify-center mx-auto">
            <SparklesIcon className="w-7 h-7 text-crimson" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">Find Your Elective Courses</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Our AI reviews your background against every 2026–27 HBS elective and surfaces the courses
            most relevant to your goals — with specific reasons why each is a strong fit.
          </p>
        </div>

        {/* How it works — collapsible, closed after first visit */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setHowToOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">How it works</h2>
            <ChevronIcon className={`w-4 h-4 text-gray-400 transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
          </button>
          {howToOpen && (
            <div className="px-6 pb-5 space-y-4 border-t border-gray-100">
              {[
                { n: '1', title: 'We analyze your profile', body: 'Your professional interests, additional background, and uploaded resume and LinkedIn are all used as inputs.' },
                { n: '2', title: 'We scan the full elective catalog', body: 'All 2026–27 HBS elective courses — across every academic area — are scored against your background.' },
                { n: '3', title: 'We surface your best fits', body: 'You receive 2–5 course recommendations with concrete rationale, professor info, and scheduling details.' },
              ].map(({ n, title, body }) => (
                <div key={n} className="flex gap-4 pt-4 first:pt-4">
                  <div className="w-7 h-7 rounded-full bg-crimson text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional elective interests */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Steer your results <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Describe academic areas or subjects you're curious about exploring in your EC year.
            </p>
            <textarea
              rows={3}
              value={electiveInterests}
              onChange={e => setElectiveInterests(e.target.value.slice(0, 1000))}
              placeholder='e.g. "sustainable finance, impact investing" or "entrepreneurship in emerging markets"'
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson placeholder:text-gray-300"
            />
            {electiveInterests.length > 900 && (
              <p className="text-xs text-gray-400 mt-1 text-right">{electiveInterests.length}/1000</p>
            )}
          </label>
        </div>

        {/* Profile nudge */}
        {!profile?.professional_interests && !profile?.resume_text && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
            <span className="flex-shrink-0">⚠</span>
            <span>
              Your profile has no professional interests or resume yet.{' '}
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
          onClick={handleRun}
          disabled={runsToday >= DAILY_LIMIT}
          className={`w-full py-3.5 rounded-xl font-semibold text-base transition-opacity flex items-center justify-center gap-2 ${
            runsToday >= DAILY_LIMIT
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-crimson text-white cursor-pointer hover:opacity-90'
          }`}
        >
          <SparklesIcon className="w-5 h-5" />
          {runsToday >= DAILY_LIMIT ? `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT})` : 'Find My Courses →'}
        </button>
        {runsToday < DAILY_LIMIT && (
          <p className="text-xs text-gray-400 text-center -mt-4">
            {DAILY_LIMIT - runsToday} run{DAILY_LIMIT - runsToday !== 1 ? 's' : ''} remaining today
          </p>
        )}
        {runsToday >= DAILY_LIMIT && (
          <p className="text-xs text-gray-400 text-center -mt-4">Resets at midnight UTC</p>
        )}
      </div>
    </div>
  )

  // ── State: results ─────────────────────────────────────────────────────────
  const displayedRun = runs.find(r => r.id === selectedRunId)

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isViewingLatest ? 'Your Course Matches' : 'Past Course Results'}
            </h1>
            {displayedRun && (
              <p className="text-sm text-gray-400 mt-1">
                {isViewingLatest ? 'Generated' : 'From'} {formatDate(displayedRun.created_at)}
              </p>
            )}
          </div>

          {isViewingLatest && (
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={handleRun}
                disabled={runsToday >= DAILY_LIMIT}
                title={runsToday >= DAILY_LIMIT ? 'Daily limit reached — resets at midnight UTC' : undefined}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  runsToday >= DAILY_LIMIT
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-crimson text-crimson hover:bg-crimson/6 cursor-pointer'
                }`}
              >
                <RefreshIcon className="w-4 h-4" />
                Re-run
              </button>
              {runsToday > 0 && (
                <span className="text-[10px] text-gray-400">
                  {runsToday >= DAILY_LIMIT
                    ? `Limit reached (${DAILY_LIMIT}/${DAILY_LIMIT})`
                    : `${DAILY_LIMIT - runsToday} run${DAILY_LIMIT - runsToday !== 1 ? 's' : ''} left today`}
                </span>
              )}
            </div>
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

        {/* Elective interests — persisted and visible for re-run */}
        {isViewingLatest && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">
                Steer your next run <span className="font-normal text-gray-400">(optional)</span>
              </span>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">
                Adjust these interests and hit Re-run to get fresh results.
              </p>
              <textarea
                rows={2}
                value={electiveInterests}
                onChange={e => setElectiveInterests(e.target.value.slice(0, 1000))}
                placeholder='e.g. "sustainable finance, impact investing" or "entrepreneurship in emerging markets"'
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson placeholder:text-gray-300"
              />
              {electiveInterests.length > 900 && (
                <p className="text-xs text-gray-400 mt-1 text-right">{electiveInterests.length}/1000</p>
              )}
            </label>
          </div>
        )}

        {/* Summary banner */}
        {isViewingLatest && matches.length > 0 && (
          <div className="space-y-3">
            {/* Strong match callout */}
            {strongCount > 0 && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-start gap-3">
                <SparklesIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    You have {strongCount} strong course {strongCount === 1 ? 'match' : 'matches'}.
                  </p>
                  <p className="text-sm text-green-700 mt-0.5">
                    These align most directly with your background — consider prioritizing them in your EC year planning.
                  </p>
                </div>
              </div>
            )}

            {/* Next-step guidance */}
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4 text-sm text-indigo-800">
              <strong>Next step:</strong> If a course's professor also appears in your{' '}
              <a href="/match" className="underline hover:text-indigo-600 font-medium">faculty matches</a>,
              that's a strong signal to reach out — they share your research interests <em>and</em> teach in your area.
            </div>
          </div>
        )}

        {/* Strength filter pills */}
        {matches.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {['strong', 'good', 'exploratory'].map(s => {
              const count = matches.filter(m => m.match_strength === s).length
              if (!count) return null
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrengthFilter(strengthFilter === s ? null : s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    strengthFilter === s
                      ? STRENGTH_STYLES[s]
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {STRENGTH_LABELS[s]} ({count})
                </button>
              )
            })}
            {strengthFilter && (
              <button
                type="button"
                onClick={() => setStrengthFilter(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Clear filter ×
              </button>
            )}
          </div>
        )}

        {/* Course cards */}
        {visibleMatches.length > 0 && (
          <div className="space-y-4">
            {visibleMatches.map(match => (
              <CourseCard
                key={match.id}
                match={match}
                isSaved={savedCourseIds.has(match.course_id)}
                onSaveToggle={() => toggleSaveCourse(match.course_id)}
                isMatchedFaculty={
                  match.faculty_courses?.faculty_id
                    ? matchedFacultyIds.has(match.faculty_courses.faculty_id)
                    : false
                }
                isLatestRun={isViewingLatest}
                onRemove={handleRemoveCourse}
              />
            ))}
          </div>
        )}

        {visibleMatches.length === 0 && matches.length > 0 && strengthFilter && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <BookOpenIcon className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No {STRENGTH_LABELS[strengthFilter].toLowerCase()} courses in this run</p>
            <button type="button" onClick={() => setStrengthFilter(null)} className="mt-3 text-sm font-medium text-crimson cursor-pointer">
              Show all results
            </button>
          </div>
        )}

        {matches.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <BookOpenIcon className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No courses found for this run</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Try steering your next run with specific interests to get more tailored results.</p>
            <button
              type="button"
              onClick={handleRun}
              disabled={runsToday >= DAILY_LIMIT}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity ${
                runsToday >= DAILY_LIMIT
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-crimson text-white cursor-pointer hover:opacity-90'
              }`}
            >
              <RefreshIcon className="w-4 h-4" />
              Re-run
            </button>
          </div>
        )}

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

// ── Course card ────────────────────────────────────────────────────────────────

function CourseCard({ match, isSaved, onSaveToggle, isMatchedFaculty, isLatestRun, onRemove }) {
  const c = match.faculty_courses
  if (!c) return null

  const [expanded, setExpanded] = useState(false)
  const desc = c.description ?? ''
  const isLongDesc = desc.length > 300
  const strengthBorder = STRENGTH_ACCENT[match.match_strength] ?? 'border-l-crimson/40'

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${strengthBorder} p-6 space-y-4 hover:-translate-y-0.5 hover:shadow-md transition-all`}>

      {/* Header: title + badges */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{c.course_title}</h3>
            {match.match_strength && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 mt-0.5 ${STRENGTH_STYLES[match.match_strength]}`}>
                {STRENGTH_LABELS[match.match_strength]}
              </span>
            )}
          </div>

          {/* Professor line */}
          {c.faculty_name && (
            <p className="text-sm text-gray-500">
              {c.faculty_id ? (
                <Link
                  to={`/faculty/${c.faculty_id}`}
                  className="text-crimson font-medium hover:opacity-70 transition-opacity"
                >
                  {c.faculty_name}
                </Link>
              ) : (
                c.faculty_name
              )}
            </p>
          )}

          {/* Faculty match badge */}
          {isMatchedFaculty && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-crimson bg-crimson/8 rounded-full px-2.5 py-0.5">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              You matched this professor
            </span>
          )}
        </div>

        {/* Right-side metadata badges */}
        <div className="flex flex-wrap gap-1.5 items-start justify-end flex-shrink-0">
          {c.credits && (
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-600">
              {c.credits} cr
            </span>
          )}
          {c.term && (
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-blue-50 text-blue-700">
              {c.term}
            </span>
          )}
          {c.quarter && (
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-500">
              {c.quarter}
            </span>
          )}
        </div>
      </div>

      {/* Unit/area */}
      {c.unit && (
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{c.unit}</p>
      )}

      {/* Description */}
      {desc && (
        <div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {isLongDesc && !expanded ? desc.slice(0, 300) + '…' : desc}
          </p>
          {isLongDesc && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1 text-xs text-crimson hover:opacity-70 transition-opacity cursor-pointer"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Rationale */}
      {match.rationale?.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why this fits you</p>
          <ul className="space-y-1.5">
            {match.rationale.map((bullet, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                <span className="text-crimson font-bold flex-shrink-0 mt-0.5">→</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-2">
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

          {isLatestRun && (
            <button
              type="button"
              onClick={() => onRemove(match.id)}
              className="text-xs text-gray-300 hover:text-red-400 transition-colors cursor-pointer px-2 py-1.5"
            >
              Remove
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {c.course_number && (
            <span className="text-xs text-gray-300">#{c.course_number}</span>
          )}
          {c.faculty_id && (
            <Link
              to={`/faculty/${c.faculty_id}`}
              className="text-sm font-semibold text-crimson hover:opacity-70 transition-opacity"
            >
              View professor profile →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
