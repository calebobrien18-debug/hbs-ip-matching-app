import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const PUB_TYPE_COLORS = {
  'Journal Article': 'bg-blue-50 text-blue-700 border-blue-200',
  'Book':            'bg-purple-50 text-purple-700 border-purple-200',
  'Case':            'bg-amber-50 text-amber-700 border-amber-200',
  'Working Paper':   'bg-gray-100 text-gray-600 border-gray-200',
  'Chapter':         'bg-teal-50 text-teal-700 border-teal-200',
}

export default function FacultyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [faculty, setFaculty] = useState(null)
  const [tags, setTags] = useState([])
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/', { replace: true }); return }

      // Fetch faculty row, tags, and publications in parallel
      const [
        { data: facultyData },
        { data: tagsData },
        { data: pubsData },
      ] = await Promise.all([
        supabase.from('faculty').select('*').eq('id', id).maybeSingle(),
        supabase.from('faculty_tags').select('tag').eq('faculty_id', id).order('tag'),
        supabase.from('faculty_publications').select('*').eq('faculty_id', id).order('year', { ascending: false }),
      ])

      if (!facultyData) { setNotFound(true); setLoading(false); return }

      setFaculty(facultyData)
      setTags((tagsData ?? []).map(r => r.tag))
      setPublications(pubsData ?? [])
      setLoading(false)
    })
  }, [id, navigate])

  if (loading) return null

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-32 px-4">
          <div className="text-center space-y-3">
            <p className="text-gray-500">Faculty profile not found.</p>
            <button onClick={() => navigate('/faculty')}
              className="text-sm font-medium cursor-pointer" style={{ color: '#A51C30' }}>
              ← Back to faculty
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate('/faculty')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
        >
          ← Back to faculty
        </button>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-5">

            {/* Avatar */}
            {faculty.image_url ? (
              <img
                src={faculty.image_url}
                alt={faculty.name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0 bg-gray-100"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-semibold"
                style={{ backgroundColor: '#A51C30' }}
              >
                {initials(faculty.name)}
              </div>
            )}

            {/* Identity */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{faculty.name}</h1>
                  {faculty.title && (
                    <p className="text-sm text-gray-500 mt-0.5">{faculty.title}</p>
                  )}
                </div>
                {faculty.unit && (
                  <span
                    className="text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 text-white flex-shrink-0"
                    style={{ backgroundColor: '#A51C30' }}
                  >
                    {faculty.unit}
                  </span>
                )}
              </div>

              {/* Links row */}
              <div className="flex flex-wrap gap-3 text-sm">
                {faculty.email && (
                  <a href={`mailto:${faculty.email}`}
                    className="text-gray-500 hover:text-gray-800 transition-colors">
                    {faculty.email}
                  </a>
                )}
                {faculty.profile_url && (
                  <a href={faculty.profile_url} target="_blank" rel="noreferrer"
                    className="font-medium hover:opacity-70 transition-opacity"
                    style={{ color: '#A51C30' }}>
                    HBS Profile →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {faculty.bio && (
            <p className="mt-5 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-5">
              {faculty.bio}
            </p>
          )}
        </div>

        {/* Research tags */}
        <Section title="Research interests">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="text-sm rounded-full px-3 py-1 border font-medium"
                  style={{ color: '#A51C30', borderColor: '#A51C30', backgroundColor: 'rgba(165,28,48,0.04)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No research tags available yet — run the scraper to populate this field.
            </p>
          )}
        </Section>

        {/* Publications */}
        <Section title={`Recent publications${publications.length ? ` (${publications.length})` : ''}`}>
          {publications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {publications.map(pub => (
                <PublicationRow key={pub.id} pub={pub} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No publications available yet — run the scraper to populate this field.
            </p>
          )}
        </Section>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function PublicationRow({ pub }) {
  const typeStyle = PUB_TYPE_COLORS[pub.pub_type] ?? 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className="py-3.5 space-y-1">
      <div className="flex items-start justify-between gap-3">
        {pub.url ? (
          <a
            href={pub.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-gray-900 hover:underline underline-offset-2 leading-snug"
          >
            {pub.title}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900 leading-snug">{pub.title}</p>
        )}
        {pub.year && (
          <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{pub.year}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {pub.pub_type && (
          <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${typeStyle}`}>
            {pub.pub_type}
          </span>
        )}
        {pub.journal && (
          <span className="text-xs text-gray-500">{pub.journal}</span>
        )}
      </div>
    </div>
  )
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
