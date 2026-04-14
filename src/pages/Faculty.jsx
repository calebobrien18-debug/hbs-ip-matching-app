import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/', { replace: true }); return }

      const { data, error } = await supabase
        .from('faculty')
        .select('*')
        .order('name')

      if (!error) setFaculty(data ?? [])
      setLoading(false)
    })
  }, [navigate])

  // Derive sorted unique units from loaded data
  const units = useMemo(() => {
    const set = new Set(faculty.map(f => f.unit).filter(Boolean))
    return [...set].sort()
  }, [faculty])

  // Client-side filter: name, title, bio, unit
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faculty.filter(f => {
      const matchesUnit = !selectedUnit || f.unit === selectedUnit
      const matchesQuery = !q || [f.name, f.title, f.bio, f.unit]
        .some(field => field?.toLowerCase().includes(q))
      return matchesUnit && matchesQuery
    })
  }, [faculty, query, selectedUnit])

  if (loading) return null

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

        {/* Search + unit filter */}
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
          <div className="flex flex-wrap gap-2">
            <UnitPill
              label="All units"
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
        </div>

        {/* Results count */}
        {(query || selectedUnit) && (
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {selectedUnit && <> in <span className="font-medium text-gray-700">{selectedUnit}</span></>}
            {query && <> matching <span className="font-medium text-gray-700">"{query}"</span></>}
          </p>
        )}

        {/* Faculty grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => <FacultyCard key={f.id} faculty={f} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No faculty matched your search.</p>
            <button
              onClick={() => { setQuery(''); setSelectedUnit(null) }}
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

// ── Faculty card ─────────────────────────────────────────────────────────────

function FacultyCard({ faculty: f }) {
  const abbrev = UNIT_ABBREV[f.unit] ?? f.unit

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">

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

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        {f.email && (
          <a
            href={`mailto:${f.email}`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors truncate"
          >
            {f.email}
          </a>
        )}
        {f.profile_url && (
          <a
            href={f.profile_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
            style={{ color: '#A51C30' }}
          >
            HBS Profile →
          </a>
        )}
      </div>
    </div>
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
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}
