import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'
import { initials } from '../lib/utils'

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

  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(true)

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

  // Load saved faculty details
  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_faculty')
      .select('faculty_id')
      .eq('user_id', session.user.id)
      .then(async ({ data: savedRows, error }) => {
        if (error) { console.error('[Dashboard] saved_faculty load error:', error); setSavedLoading(false); return }
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

  if (loading) return null

  const hasProfile = profiles.length > 0
  const welcomeName = hasProfile ? profiles[0].first_name : guestGreeting

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {welcomeName}!
          </h1>
        </div>

        {/* Profile list + action button */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
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
              <p className="text-sm text-gray-500">No profile yet.</p>
              <button
                type="button"
                onClick={() => navigate('/profile/new')}
                className="mt-3 text-sm font-medium cursor-pointer text-crimson"
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              My Matches
            </h2>
            <Link to="/match" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">
              {matches.length > 0 ? 'View & re-run →' : 'Get matched →'}
            </Link>
          </div>

          {matchesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No matches yet.</p>
              <Link to="/match" className="mt-3 inline-block text-sm font-medium text-crimson">
                Find your faculty matches →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {matches.map(m => {
                const f = m.faculty
                if (!f) return null
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all group">

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
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          className="p-1.5 rounded-lg text-gray-400 hover:text-crimson hover:bg-crimson/6 transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                      </div>

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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              My Saved Faculty
            </h2>
            <Link to="/faculty" className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity">
              Browse faculty →
            </Link>
          </div>

          {savedLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
            </div>
          ) : savedFaculty.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No saved faculty yet.</p>
              <Link to="/faculty" className="mt-3 inline-block text-sm font-medium text-crimson">
                Browse faculty →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {savedFaculty.map(f => (
                <li key={f.id}>
                  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-crimson hover:shadow-sm transition-all group">
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

                    {/* Unsave button */}
                    <button
                      type="button"
                      onClick={() => handleUnsave(f.id)}
                      title="Remove from saved"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-crimson hover:bg-crimson/6 transition-colors cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100"
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
    <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
      {children}
    </span>
  )
}

const STRENGTH_STYLES = {
  strong:      'bg-green-700 text-white',
  good:        'bg-green-100 text-green-800 border border-green-300',
  exploratory: 'bg-green-50 text-green-600 border border-green-200',
}
const STRENGTH_LABELS = {
  strong:      'Strong',
  good:        'Good',
  exploratory: 'Exploratory',
}

function LightbulbIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a7 7 0 0 1 5.468 11.37c-.592.772-1.468 1.7-1.468 2.63v1a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-1c0-.93-.876-1.858-1.468-2.63A7 7 0 0 1 12 2Zm-2 15h4v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1Z" />
    </svg>
  )
}

function ArrowRightIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}
