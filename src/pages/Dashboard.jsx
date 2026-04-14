import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'

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
                onClick={() => navigate('/profile/new')}
                className="mt-3 text-sm font-medium cursor-pointer"
                style={{ color: '#A51C30' }}
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
                    className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-[#A51C30] hover:shadow-sm transition-all"
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
