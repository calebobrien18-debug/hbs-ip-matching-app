import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth, useSavedCourses } from '../lib/hooks'
import { DAILY_LIMIT } from '../lib/constants'
import {
  SparklesIcon, RefreshIcon, ChevronIcon, BookmarkIcon,
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
    setPageState('running')

    try {
      const data = await invokeEdgeFunction('generate-course-matches',
        electiveInterests ? { elective_interests: electiveInterests } : undefined
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
      setPageState('results')
    } catch (err) {
      console.error('Course match error:', err)
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
  const archivedRuns = runs.slice(1)

  // ── Render states ──────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-gray-50">
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
      </div>
    </div>
  )

  // ── State: ready ──────────────────────────────────────────────────────────
  if (pageState === 'ready') return (
    <div className="min-h-screen bg-gray-50">
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

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">How it works</h2>
          <div className="space-y-4">
            {[
              { n: '1', title: 'We analyze your profile', body: 'Your professional interests, additional background, and uploaded resume and LinkedIn are all used as inputs.' },
              { n: '2', title: 'We scan the full elective catalog', body: 'All 2026–27 HBS elective courses — across every academic area — are scored against your background.' },
              { n: '3', title: 'We surface your best fits', body: 'You receive 2–5 course recommendations with concrete rationale, professor info, and scheduling details.' },
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
    <div className="min-h-screen bg-gray-50">
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

        {/* Summary banner */}
        {isViewingLatest && matches.length > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4 flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {matches.length} course{matches.length !== 1 ? 's' : ''} matched to your background
              </p>
              <p className="text-sm text-blue-700 mt-0.5">
                These are ranked by fit with your professional interests and career goals. Save the ones you want to revisit.
              </p>
            </div>
          </div>
        )}

        {/* Course cards */}
        {matches.length > 0 && (
          <div className="space-y-4">
            {matches.map(match => (
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
              />
            ))}
          </div>
        )}

        {matches.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center space-y-3">
            <p className="text-sm text-gray-500">No courses found for this run.</p>
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

function CourseCard({ match, isSaved, onSaveToggle, isMatchedFaculty }) {
  const c = match.faculty_courses
  if (!c) return null

  const [expanded, setExpanded] = useState(false)
  const desc = c.description ?? ''
  const isLongDesc = desc.length > 300

  return (
    <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-crimson/40 p-6 space-y-4">

      {/* Header: title + badges */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{c.course_title}</h3>

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
