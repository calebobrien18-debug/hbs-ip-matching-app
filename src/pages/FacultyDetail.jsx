import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth, useSavedFaculty } from '../lib/hooks'
import { initials } from '../lib/utils'

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
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedPubType, setSelectedPubType] = useState(null)

  const session = useRequireAuth()
  const { savedIds, toggleSave } = useSavedFaculty(session)

  useEffect(() => {
    if (!session) return
    async function load() {
      // Fetch faculty row, tags, publications, and courses in parallel
      const [
        { data: facultyData },
        { data: tagsData },
        { data: pubsData },
        { data: coursesData },
      ] = await Promise.all([
        supabase.from('faculty').select('*').eq('id', id).maybeSingle(),
        supabase.from('faculty_tags').select('tag').eq('faculty_id', id).order('tag'),
        supabase.from('faculty_publications').select('*').eq('faculty_id', id).order('year', { ascending: false }),
        supabase.from('faculty_courses').select('*').eq('faculty_id', id).order('term').order('course_title'),
      ])

      if (!facultyData) { setNotFound(true); setLoading(false); return }

      setFaculty(facultyData)
      setTags((tagsData ?? []).map(r => r.tag))
      setPublications(pubsData ?? [])
      setCourses(coursesData ?? [])
      setLoading(false)
    }
    load()
  }, [session, id])

  // Ordered list of pub types present for this faculty
  const pubTypes = useMemo(() => {
    const order = ['Journal Article', 'Working Paper', 'Case', 'Book', 'Chapter', 'Conference Paper', 'Report', 'Other']
    const present = new Set(publications.map(p => p.pub_type).filter(Boolean))
    return order.filter(t => present.has(t))
  }, [publications])

  const filteredPubs = useMemo(() =>
    selectedPubType ? publications.filter(p => p.pub_type === selectedPubType) : publications
  , [publications, selectedPubType])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    </div>
  )

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-32 px-4">
          <div className="text-center space-y-3">
            <p className="text-gray-500">Faculty profile not found.</p>
            <button type="button" onClick={() => navigate('/faculty')}
              className="text-sm font-medium cursor-pointer text-crimson">
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
          type="button"
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
                className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-semibold bg-crimson"
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {faculty.unit && (
                    <span className="text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 text-white bg-crimson">
                      {faculty.unit}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSave(id)}
                    title={savedIds.has(id) ? 'Remove from saved' : 'Save faculty'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-crimson hover:bg-crimson/6 transition-colors cursor-pointer"
                  >
                    <BookmarkIcon filled={savedIds.has(id)} />
                  </button>
                </div>
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
                    className="font-medium hover:opacity-70 transition-opacity text-crimson">
                    HBS Profile →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {faculty.bio && (
            <p className="mt-5 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-5">
              {truncateBio(stripBioHeader(faculty.bio, faculty.name, faculty.title), 4)}
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
                  className="text-sm rounded-full px-3 py-1 border font-medium text-crimson border-crimson bg-crimson/4"
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

        {/* Courses */}
        {courses.length > 0 && (
          <Section title={`Courses (${courses.length})`}>
            <div className="divide-y divide-gray-100">
              {courses.map(course => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
          </Section>
        )}

        {/* Publications */}
        <Section title={`Recent publications${publications.length ? ` (${publications.length})` : ''}`}>
          {publications.length > 0 ? (
            <>
              {/* Type filter pills — only shown when 2+ types exist */}
              {pubTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  <PubTypePill
                    label="All"
                    active={selectedPubType === null}
                    typeStyle={null}
                    onClick={() => setSelectedPubType(null)}
                  />
                  {pubTypes.map(type => (
                    <PubTypePill
                      key={type}
                      label={type}
                      active={selectedPubType === type}
                      typeStyle={PUB_TYPE_COLORS[type]}
                      onClick={() => setSelectedPubType(selectedPubType === type ? null : type)}
                    />
                  ))}
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {filteredPubs.map(pub => (
                  <PublicationRow key={pub.id} pub={pub} />
                ))}
              </div>

              {filteredPubs.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No publications of this type.</p>
              )}
            </>
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

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-crimson">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function PubTypePill({ label, active, typeStyle, onClick }) {
  // When active and a typeStyle exists, use the type's own colour scheme (inline lookup)
  // When active with no typeStyle (the "All" pill), use crimson token
  // When inactive, use a neutral Tailwind style
  let pillClass = 'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border '
  let style

  if (!active) {
    pillClass += 'bg-white text-gray-700 border-gray-300'
  } else if (typeStyle) {
    style = ACTIVE_TYPE_STYLES[label]
    if (!style) pillClass += 'bg-crimson text-white border-crimson'
  } else {
    pillClass += 'bg-crimson text-white border-crimson'
  }

  return (
    <button type="button" onClick={onClick} className={pillClass} style={style}>
      {label}
    </button>
  )
}

const ACTIVE_TYPE_STYLES = {
  'Journal Article': { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' },
  'Book':            { backgroundColor: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' },
  'Case':            { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' },
  'Working Paper':   { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' },
  'Chapter':         { backgroundColor: '#f0fdfa', color: '#0f766e', borderColor: '#99f6e4' },
  'Conference Paper':{ backgroundColor: '#fdf4ff', color: '#9333ea', borderColor: '#f0abfc' },
  'Report':          { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' },
  'Other':           { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' },
}

function CourseRow({ course }) {
  const termLabel = [course.term, course.quarter].filter(Boolean).join(' · ')
  const creditLabel = course.credits != null ? `${course.credits} cr` : null

  return (
    <div className="py-3.5 space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900 leading-snug">{course.course_title}</p>
        {creditLabel && (
          <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{creditLabel}</span>
        )}
      </div>
      {termLabel && (
        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border text-crimson border-crimson bg-crimson/6"
        >
          {termLabel}
        </span>
      )}
      {course.description && (
        <p className="text-xs text-gray-500 leading-relaxed">{course.description}</p>
      )}
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


/**
 * Strip the name/title header that HBS profile pages inject at the top of bio text.
 * Pattern: "[Name] [Title] [Title] [Name] actual bio..."
 * Detected by: bio starts with first name AND title appears near the start.
 */
function stripBioHeader(bio, name, title) {
  if (!bio || !name) return bio

  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0].replace(/\.$/, '')   // e.g. "J." → "J"
  const lastName  = nameParts[nameParts.length - 1]

  // Only attempt stripping when bio starts with the faculty's first name
  if (!bio.toLowerCase().startsWith(firstName.toLowerCase())) return bio

  // Confirm the title also appears near the top (header pattern, not normal prose)
  const titleAnchor = (title ?? '').split(/\s+/).slice(0, 4).join(' ')
  if (!titleAnchor || !bio.slice(0, 300).toLowerCase().includes(titleAnchor.toLowerCase())) return bio

  // Find the second occurrence of the last name — that's where the real bio begins
  const first  = bio.indexOf(lastName)
  const second = bio.indexOf(lastName, first + lastName.length)
  if (second === -1 || second > 700) return bio

  const stripped = bio.slice(second).trim()
  return stripped.length >= 50 ? stripped : bio
}

function truncateBio(text, maxSentences = 4) {
  if (!text) return null
  const sentences = text.match(/[^.!?]+[.!?]+["']?/g) ?? []
  if (sentences.length <= maxSentences) return text.trim()
  return sentences.slice(0, maxSentences).join(' ').trim()
}
