import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'
import { initials, groupCourseRows } from '../lib/utils'
import { STRENGTH_STYLES, STRENGTH_LABELS } from '../lib/constants'
import { LightbulbIcon, ArrowRightIcon, XIcon, SparklesIcon, BookmarkIcon, BookOpenIcon } from '../components/Icons'

function LaunchChecklist({ profiles, matches, savedFaculty, savedIdeas, emailDraftCount, dataReady }) {
  const steps = useMemo(() => [
    {
      label: 'Complete your profile',
      done: profiles.length > 0 && !!profiles[0]?.professional_interests,
      href: profiles.length === 0 ? '/profile/new' : '/profile/edit',
      cta: profiles.length === 0 ? 'Create profile →' : 'Update profile →',
    },
    {
      label: 'Run your first faculty match',
      done: matches.length > 0,
      href: '/match',
      cta: 'Go to matching →',
    },
    {
      label: 'Save 2–3 faculty',
      done: savedFaculty.length >= 2,
      href: '/match',
      cta: 'Browse matches →',
    },
    {
      label: 'Generate a case study idea',
      done: savedIdeas.length > 0,
      href: matches.length > 0 ? `/case-ideas/${matches[0]?.id}` : '/match',
      cta: 'Generate ideas →',
    },
    {
      label: 'Draft your first outreach email',
      done: emailDraftCount > 0,
      href: '/saved-ideas',
      cta: 'Draft email →',
    },
  ], [profiles, matches, savedFaculty, savedIdeas, emailDraftCount])

  const allDone = steps.every(s => s.done)
  const nextIdx = steps.findIndex(s => !s.done)

  if (!dataReady) return null

  if (allDone) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
        <span className="text-green-600 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-green-900">You're on track. All key steps complete.</p>
          <p className="text-xs text-green-700 mt-0.5">Head to <Link to="/saved-ideas" className="underline font-medium">Saved Ideas</Link> to draft and refine your outreach emails.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Getting started</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {steps.map((step, i) => {
          const isNext = i === nextIdx
          const isPast = step.done
          const isFuture = !isPast && !isNext
          return (
            <li key={i} className={`flex items-center gap-3 px-5 py-3.5 ${isNext ? 'bg-crimson/4' : ''}`}>
              {/* Status icon */}
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                isPast
                  ? 'bg-green-600 border-green-600 text-white'
                  : isNext
                    ? 'border-crimson bg-white text-crimson'
                    : 'border-gray-200 bg-white text-gray-300'
              }`}>
                {isPast ? '✓' : i + 1}
              </div>

              {/* Label */}
              <span className={`flex-1 text-sm ${isPast ? 'line-through text-gray-400' : isNext ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>

              {/* CTA for next step */}
              {isNext && (
                <Link
                  to={step.href}
                  className="flex-shrink-0 text-xs font-semibold text-white bg-crimson px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const FACULTY_STATUS_OPTIONS = [
  { value: 'interested',  label: 'Interested',   style: 'bg-gray-100 text-gray-600' },
  { value: 'researching', label: 'Researching',  style: 'bg-blue-100 text-blue-700' },
  { value: 'top_choice',  label: 'Top choice',   style: 'bg-crimson/10 text-crimson' },
  { value: 'emailed',     label: 'Emailed',      style: 'bg-green-100 text-green-700' },
  { value: 'not_now',     label: 'Not now',      style: 'bg-gray-50 text-gray-400 italic' },
]

const GUEST_GREETINGS = [
  'Adventurer', 'Trailblazer', 'Visionary', 'Pioneer', 'Changemaker',
  'Dreamer', 'Innovator', 'Explorer', 'Maverick', 'Luminary',
  'Catalyst', 'Pathfinder', 'Idealist', 'Scholar', 'Seeker',
]

function randomGreeting() {
  return GUEST_GREETINGS[Math.floor(Math.random() * GUEST_GREETINGS.length)]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const session = useRequireAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [guestGreeting] = useState(randomGreeting)

  const [savedFaculty, setSavedFaculty] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [savedFacultyStatusMap, setSavedFacultyStatusMap] = useState(new Map())

  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(true)

  const [savedIdeas, setSavedIdeas] = useState([])
  const [savedIdeasLoading, setSavedIdeasLoading] = useState(true)

  const [teachingCourses, setTeachingCourses] = useState([])
  const [teachingLoading, setTeachingLoading] = useState(false)
  const [emailDraftCount, setEmailDraftCount] = useState(0)
  const [savedDraftCount, setSavedDraftCount] = useState(0)

  useEffect(() => {
    if (!session) return
    supabase
      .from('hbs_ip')
      .select('id, first_name, last_name, email, program, graduation_year, hbs_section, professional_interests')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [session])

  // Load latest match run
  useEffect(() => {
    if (!session) return
    supabase
      .from('match_runs')
      .select('id')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(async ({ data: latestRun }) => {
        if (!latestRun) { setMatchesLoading(false); return }
        const { data: matchData } = await supabase
          .from('faculty_matches')
          .select('id, rank, match_strength, faculty(id, name, unit, image_url, title)')
          .eq('run_id', latestRun.id)
          .order('rank')
        setMatches(matchData ?? [])
        setMatchesLoading(false)
      })
  }, [session])

  // Load teaching context: courses from matched faculty, sorted by match rank
  useEffect(() => {
    if (matches.length === 0) { setTeachingCourses([]); return }
    const facultyIds = matches.map(m => m.faculty?.id).filter(Boolean)
    if (facultyIds.length === 0) return

    setTeachingLoading(true)
    supabase
      .from('faculty_courses')
      .select('*, faculty(id, name)')
      .in('faculty_id', facultyIds)
      .then(({ data }) => {
        if (!data) { setTeachingCourses([]); setTeachingLoading(false); return }
        const grouped = groupCourseRows(data)
        const rankMap = Object.fromEntries(facultyIds.map((id, i) => [id, i]))
        grouped.sort((a, b) => {
          const aRank = Math.min(...a.faculty.map(f => rankMap[f.id] ?? 999))
          const bRank = Math.min(...b.faculty.map(f => rankMap[f.id] ?? 999))
          return aRank - bRank
        })
        setTeachingCourses(grouped.slice(0, 3))
        setTeachingLoading(false)
      })
  }, [matches])

  // Load saved case study ideas
  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_case_ideas')
      .select('id, match_id, title, faculty:faculty_id(id, name, image_url)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[Dashboard] saved_case_ideas load error:', error)
        setSavedIdeas(data ?? [])
        setSavedIdeasLoading(false)
      })
  }, [session])

  // Load email draft count for checklist step 5
  useEffect(() => {
    if (!session) return
    supabase
      .from('email_draft_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setEmailDraftCount(count ?? 0))
  }, [session])

  // Load saved email draft count for dashboard badge
  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_email_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setSavedDraftCount(count ?? 0))
  }, [session])

  // Load saved faculty details
  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_faculty')
      .select('faculty_id, status')
      .eq('user_id', session.user.id)
      .then(async ({ data: savedRows, error }) => {
        if (error) { console.error('[Dashboard] saved_faculty load error:', error); setSavedLoading(false); return }
        setSavedFacultyStatusMap(new Map((savedRows ?? []).map(r => [r.faculty_id, r.status ?? 'interested'])))
        const ids = (savedRows ?? []).map(r => r.faculty_id)
        if (ids.length === 0) { setSavedFaculty([]); setSavedLoading(false); return }
        const { data: facultyData, error: facError } = await supabase
          .from('faculty')
          .select('id, name, unit, image_url, title')
          .in('id', ids)
          .order('name')
        if (facError) console.error('[Dashboard] faculty detail load error:', facError)
        setSavedFaculty(facultyData ?? [])
        setSavedLoading(false)
      })
  }, [session])

  async function handleUnsave(facultyId) {
    // Optimistic update
    setSavedFaculty(prev => prev.filter(f => f.id !== facultyId))
    await supabase
      .from('saved_faculty')
      .delete()
      .eq('user_id', session.user.id)
      .eq('faculty_id', facultyId)
  }

  async function handleUpdateFacultyStatus(facultyId, status) {
    setSavedFacultyStatusMap(prev => new Map(prev).set(facultyId, status))
    await supabase
      .from('saved_faculty')
      .update({ status })
      .eq('user_id', session.user.id)
      .eq('faculty_id', facultyId)
  }

  async function handleUnmatchFromDashboard(matchId) {
    setMatches(prev => prev.filter(m => m.id !== matchId))  // optimistic
    await supabase.from('faculty_matches').delete().eq('id', matchId)
  }

  async function handleDeleteSavedIdea(ideaId) {
    setSavedIdeas(prev => prev.filter(i => i.id !== ideaId))  // optimistic
    await supabase.from('saved_case_ideas').delete().eq('id', ideaId)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="border-l-2 border-gray-200 pl-4 space-y-2">
            <div className="h-7 w-60 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-44 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          {/* Section skeletons */}
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                {[0, 1].map(j => (
                  <div key={j} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const hasProfile = profiles.length > 0
  const welcomeName = hasProfile ? profiles[0].first_name : guestGreeting

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="border-l-2 border-crimson pl-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, {welcomeName}.
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here's where things stand.</p>
        </div>

        {/* Launch checklist */}
        <LaunchChecklist
          profiles={profiles}
          matches={matches}
          savedFaculty={savedFaculty}
          savedIdeas={savedIdeas}
          emailDraftCount={emailDraftCount}
          dataReady={!loading && !matchesLoading && !savedLoading && !savedIdeasLoading}
        />

        {/* Profile list + action button */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Your profile{profiles.length !== 1 ? 's' : ''}
            </h2>
            {!hasProfile && (
              <button
                onClick={() => navigate('/profile/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer bg-crimson hover:bg-crimson-dark transition-colors"
              >
                + Add profile
              </button>
            )}
          </div>

          {profiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-gray-600">No profile yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Your profile is the foundation: matching, case ideas, and email drafts all draw from it.
              </p>
              <button
                type="button"
                onClick={() => navigate('/profile/new')}
                className="mt-4 text-sm font-medium cursor-pointer text-crimson"
              >
                Create your profile →
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {profiles.map(p => (
                <li key={p.id}>
                  <Link
                    to={`/profile/${p.id}`}
                    className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-crimson hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-gray-900">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{p.email}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {p.program && <Badge>{p.program}</Badge>}
                          {p.graduation_year && <Badge>Class of {p.graduation_year}</Badge>}
                          {p.hbs_section && <Badge>Section {p.hbs_section}</Badge>}
                        </div>
                        {p.professional_interests && (
                          <p className="text-sm text-gray-400 pt-1 line-clamp-2">
                            {p.professional_interests}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-300 text-lg flex-shrink-0">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Matches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
              <SparklesIcon className="w-3.5 h-3.5 text-crimson flex-shrink-0" />
              My Matches
            </h2>
            <Link to="/match" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">
              {matches.length > 0 ? 'View & re-run →' : 'Get matched →'}
            </Link>
          </div>

          {matchesLoading ? (
            <div className="space-y-2">
              {[0, 1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <SparklesIcon className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">No matches yet</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs mx-auto">
                Run the matching tool to get a shortlist of faculty whose research aligns with your background and goals.
              </p>
              <Link to="/match" className="mt-4 inline-block text-sm font-medium text-crimson">
                Find your matches →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {matches.map(m => {
                const f = m.faculty
                if (!f) return null
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-5 py-3.5 hover:border-gray-300 hover:shadow-sm hover:-translate-y-px transition-all group">

                      {/* Rank badge */}
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {m.rank}
                      </span>

                      {/* Avatar */}
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold bg-crimson">
                          {initials(f.name)}
                        </div>
                      )}

                      {/* Name + unit + strength */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{f.name}</p>
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STRENGTH_STYLES[m.match_strength] ?? STRENGTH_STYLES.good}`}>
                            {STRENGTH_LABELS[m.match_strength] ?? 'Match'}
                          </span>
                        </div>
                        {f.unit && <p className="text-xs text-gray-500 mt-0.5 truncate">{f.unit}</p>}
                      </div>

                      {/* Action links */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/case-ideas/${m.id}`}
                          title="Generate case study ideas"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-crimson hover:bg-crimson/6 transition-colors"
                        >
                          <LightbulbIcon className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/faculty/${f.id}`}
                          title="View full profile"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleUnmatchFromDashboard(m.id)}
                          title="Remove match"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Teaching context from matched faculty — only shown when matches exist */}
        {!matchesLoading && matches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                <BookOpenIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                Teaching context from your matches
              </h2>
              <Link to="/match" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">
                View all →
              </Link>
            </div>

            {teachingLoading ? (
              <div className="space-y-2">
                {[0, 1].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-3 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-3/5" />
                      <div className="h-3 bg-gray-100 rounded w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : teachingCourses.length > 0 ? (
              <ul className="space-y-2">
                {teachingCourses.map(c => {
                  const prof = c.faculty?.[0]
                  return (
                    <li key={c.id}>
                      <Link
                        to={prof?.id ? `/faculty/${prof.id}` : '/match'}
                        className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-5 py-3.5 hover:border-gray-300 hover:shadow-sm hover:-translate-y-px transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{c.course_title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {prof?.name && (
                              <p className="text-xs text-gray-500 truncate">{prof.name}</p>
                            )}
                            {c.credits && (
                              <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                {c.credits} cr
                              </span>
                            )}
                            {c.term && (
                              <span className="text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                {c.term}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-1" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )}

        {/* Saved Case Study Ideas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
              <LightbulbIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              Saved Case Study Ideas
            </h2>
            <div className="flex items-center gap-3">
              {savedDraftCount > 0 && (
                <Link to="/saved-ideas" className="text-xs text-gray-400 hover:text-gray-600 transition-opacity">
                  {savedDraftCount} saved draft{savedDraftCount !== 1 ? 's' : ''} →
                </Link>
              )}
              {savedIdeas.length > 0
                ? <Link to="/saved-ideas" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">View library →</Link>
                : <Link to="/match"       className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">Explore matches →</Link>
              }
            </div>
          </div>

          {savedIdeasLoading ? (
            <div className="space-y-2">
              {[0, 1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : savedIdeas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <LightbulbIcon className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">No saved ideas yet</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs mx-auto">
                Go to your matches and use <span className="font-medium">Case study ideas</span> on any match card to generate concepts. Save the ones worth developing.
              </p>
              <Link to="/match" className="mt-4 inline-block text-sm font-medium text-crimson">
                Explore your matches →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {savedIdeas.map(idea => {
                const fac = idea.faculty
                return (
                  <li key={idea.id}>
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-5 py-3.5 hover:border-crimson/30 hover:shadow-sm transition-all group">
                      {/* Faculty avatar */}
                      {fac?.image_url ? (
                        <img src={fac.image_url} alt={fac.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold bg-crimson">
                          {initials(fac?.name ?? '?')}
                        </div>
                      )}

                      {/* Title + faculty name */}
                      <Link to="/saved-ideas" className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug truncate">{idea.title}</p>
                        {fac?.name && (
                          <p className="text-xs text-gray-400 mt-0.5">with {fac.name}</p>
                        )}
                      </Link>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedIdea(idea.id)}
                        title="Remove saved idea"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-crimson hover:bg-crimson/6 transition-colors cursor-pointer flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Saved Faculty */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
              <BookmarkIcon filled={false} className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
              My Shortlist
            </h2>
            <Link to="/faculty" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">
              Browse faculty →
            </Link>
          </div>

          {savedLoading ? (
            <div className="space-y-2">
              {[0, 1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : savedFaculty.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <BookmarkIcon filled={false} className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">Your shortlist is empty</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs mx-auto">
                Save faculty from your matches or the browse page. Use the status picker to track where each conversation stands.
              </p>
              <Link to="/faculty" className="mt-4 inline-block text-sm font-medium text-crimson">
                Browse faculty →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {savedFaculty.map(f => (
                <li key={f.id}>
                  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-5 py-3.5 hover:border-crimson hover:shadow-sm transition-all group">
                    {/* Avatar */}
                    {f.image_url ? (
                      <img src={f.image_url} alt={f.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold bg-crimson">
                        {initials(f.name)}
                      </div>
                    )}

                    {/* Info — links to detail page */}
                    <Link to={`/faculty/${f.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{f.name}</p>
                      {f.unit && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{f.unit}</p>
                      )}
                    </Link>

                    {/* Status picker */}
                    {(() => {
                      const currentStatus = savedFacultyStatusMap.get(f.id) ?? 'interested'
                      const currentOption = FACULTY_STATUS_OPTIONS.find(o => o.value === currentStatus) ?? FACULTY_STATUS_OPTIONS[0]
                      return (
                        <select
                          value={currentStatus}
                          onChange={e => handleUpdateFacultyStatus(f.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-crimson/30 ${currentOption.style}`}
                          title="Update shortlist status for this faculty member"
                        >
                          {FACULTY_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )
                    })()}

                    {/* Unsave button */}
                    <button
                      type="button"
                      onClick={() => handleUnsave(f.id)}
                      title="Remove from shortlist"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-crimson hover:bg-crimson/6 transition-colors cursor-pointer flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
      </div>
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="inline-block text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">
      {children}
    </span>
  )
}

