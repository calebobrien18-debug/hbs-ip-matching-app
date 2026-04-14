import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

// Short display labels for unit filter pills
const UNIT_ABBREV = {
  'Accounting & Management':                    'A&M',
  'Business, Government & International Economy': 'BGIE',
  'Entrepreneurial Management':                  'EM',
  'Finance':                                     'Finance',
  'General Management':                          'GM',
  'Marketing':                                   'Marketing',
  'Negotiation, Organizations & Markets':        'NOM',
  'Organizational Behavior':                     'OB',
  'Strategy':                                    'Strategy',
  'Technology & Operations Management':          'TOM',
}

export default function Faculty() {
  const navigate = useNavigate()
  const [faculty, setFaculty] = useState([])
  const [tagsByFaculty, setTagsByFaculty] = useState({}) // { faculty_id: string[] }
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/', { replace: true }); return }

      // Fetch faculty and all tags in parallel
      const [
        { data: facultyData, error: facultyError },
        { data: tagsData },
      ] = await Promise.all([
        supabase.from('faculty').select('*').order('name'),
        supabase.from('faculty_tags').select('faculty_id, tag'),
      ])

      if (!facultyError) setFaculty(facultyData ?? [])

      // Build a map: faculty_id → string[]
      const tagMap = {}
      for (const row of (tagsData ?? [])) {
        if (!tagMap[row.faculty_id]) tagMap[row.faculty_id] = []
        tagMap[row.faculty_id].push(row.tag)
      }
      setTagsByFaculty(tagMap)

      setLoading(false)
    })
  }, [navigate])

  // Derive sorted unique units from loaded data
  const units = useMemo(() => {
    const set = new Set(faculty.map(f => f.unit).filter(Boolean))
    return [...set].sort()
  }, [faculty])

  // Derive cross-cutting tags (appear on 2+ faculty), sorted by frequency
  const popularTags = useMemo(() => {
    const count = {}
    Object.values(tagsByFaculty).forEach(tags =>
      tags.forEach(t => { count[t] = (count[t] ?? 0) + 1 })
    )
    return Object.entries(count)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [tagsByFaculty])

  // Client-side filter: name, title, bio, unit, tags
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faculty.filter(f => {
      const matchesUnit = !selectedUnit || f.unit === selectedUnit
      const facTags = tagsByFaculty[f.id] ?? []
      const matchesTag = !selectedTag || facTags.includes(selectedTag)
      const matchesQuery = !q || [f.name, f.title, f.bio, f.unit, ...facTags]
        .some(field => field?.toLowerCase().includes(q))
      return matchesUnit && matchesTag && matchesQuery
    })
  }, [faculty, tagsByFaculty, query, selectedUnit, selectedTag])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[#A51C30] animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Browse Faculty</h1>
          <p className="text-sm text-gray-500 mt-1">
            {faculty.length} HBS faculty members · search by name, research area, or unit
          </p>
        </div>

        {/* Search + filters */}
        <div className="mb-6 space-y-3">
          {/* Search input */}
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search faculty…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-[#A51C30] focus:border-transparent
                         placeholder:text-gray-400 bg-white"
            />
          </div>

          {/* Unit filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 mr-1 w-10 flex-shrink-0">Unit</span>
            <UnitPill
              label="All"
              active={selectedUnit === null}
              onClick={() => setSelectedUnit(null)}
            />
            {units.map(unit => (
              <UnitPill
                key={unit}
                label={UNIT_ABBREV[unit] ?? unit}
                title={unit}
                active={selectedUnit === unit}
                onClick={() => setSelectedUnit(selectedUnit === unit ? null : unit)}
              />
            ))}
          </div>

          {/* Topic tag filter pills (cross-cutting tags only) */}
          {popularTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-400 mr-1 w-10 flex-shrink-0">Topic</span>
              <UnitPill
                label="All"
                active={selectedTag === null}
                onClick={() => setSelectedTag(null)}
              />
              {popularTags.map(tag => (
                <UnitPill
                  key={tag}
                  label={tag}
                  active={selectedTag === tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {(query || selectedUnit || selectedTag) && (
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {selectedUnit && <> in <span className="font-medium text-gray-700">{selectedUnit}</span></>}
            {selectedTag && <> tagged <span className="font-medium text-gray-700">"{selectedTag}"</span></>}
            {query && <> matching <span className="font-medium text-gray-700">"{query}"</span></>}
          </p>
        )}

        {/* Faculty grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <FacultyCard
                key={f.id}
                faculty={f}
                tags={tagsByFaculty[f.id] ?? []}
                selectedTag={selectedTag}
                onTagClick={setSelectedTag}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No faculty matched your search.</p>
            <button
              onClick={() => { setQuery(''); setSelectedUnit(null); setSelectedTag(null) }}
              className="mt-3 text-sm font-medium cursor-pointer"
              style={{ color: '#A51C30' }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Faculty card ──────────────────────────────────────────────────────────────

function FacultyCard({ faculty: f, tags, selectedTag, onTagClick }) {
  const abbrev = UNIT_ABBREV[f.unit] ?? f.unit
  const previewTags = tags.slice(0, 4)

  return (
    <Link
      to={`/faculty/${f.id}`}
      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3
                 hover:shadow-md hover:border-gray-300 transition-all block"
    >
      {/* Unit badge */}
      {f.unit && (
        <span
          className="self-start text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 text-white"
          style={{ backgroundColor: '#A51C30' }}
          title={f.unit}
        >
          {abbrev}
        </span>
      )}

      {/* Photo + name row */}
      <div className="flex items-center gap-3">
        {f.image_url ? (
          <img
            src={f.image_url}
            alt={f.name}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 bg-gray-100"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: '#A51C30' }}
          >
            {initials(f.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{f.name}</p>
          {f.title && (
            <p className="text-xs text-gray-500 leading-snug line-clamp-2">{f.title}</p>
          )}
        </div>
      </div>

      {/* Bio excerpt */}
      {f.bio && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">{f.bio}</p>
      )}

      {/* Research tag pills — clicking a tag filters by it */}
      {previewTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {previewTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={e => {
                e.preventDefault()
                onTagClick(selectedTag === tag ? null : tag)
              }}
              className="text-[10px] font-medium rounded-full px-2 py-0.5 border cursor-pointer transition-colors"
              style={
                selectedTag === tag
                  ? { backgroundColor: '#A51C30', color: '#fff', borderColor: '#A51C30' }
                  : { color: '#A51C30', borderColor: 'rgba(165,28,48,0.3)', backgroundColor: 'rgba(165,28,48,0.04)' }
              }
            >
              {tag}
            </button>
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] text-gray-400 self-center">+{tags.length - 4} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        {f.email && (
          <a
            href={`mailto:${f.email}`}
            onClick={e => e.stopPropagation()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors truncate"
          >
            {f.email}
          </a>
        )}
        <span className="text-xs font-medium flex-shrink-0 ml-auto" style={{ color: '#A51C30' }}>
          View profile →
        </span>
      </div>
    </Link>
  )
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function UnitPill({ label, title, active, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border"
      style={
        active
          ? { backgroundColor: '#A51C30', color: '#fff', borderColor: '#A51C30' }
          : { backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }
      }
    >
      {label}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  )
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
