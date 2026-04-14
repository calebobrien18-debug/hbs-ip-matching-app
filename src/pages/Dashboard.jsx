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

  // Load saved faculty details
  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_faculty')
      .select('faculty_id')
      .eq('user_id', session.user.id)
      .then(async ({ data: savedRows }) => {
        const ids = (savedRows ?? []).map(r => r.faculty_id)
        if (ids.length === 0) { setSavedFaculty([]); setSavedLoading(false); return }
        const { data: facultyData } = await supabase
          .from('faculty')
          .select('id, name, unit, image_url, title')
          .in('id', ids)
          .order('name')
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
