import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'
import { initials } from '../lib/utils'

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
  const session = useRequireAuth()
  const [faculty, setFaculty] = useState([])
  const [tagsByFaculty, setTagsByFaculty] = useState({}) // { faculty_id: string[] }
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedTags, setSelectedTags] = useState(new Set())

  useEffect(() => {
    if (!session) return
    async function load() {
      const [
        { data: facultyData, error: facultyError },
        { data: tagsData },
      ] = await Promise.all([
        supabase.from('faculty').select('*').order('name'),
        supabase.from('faculty_tags').select('faculty_id, tag'),
      ])

      if (!facultyError) setFaculty(facultyData ?? [])

      const tagMap = {}
      for (const row of (tagsData ?? [])) {
        if (!tagMap[row.faculty_id]) tagMap[row.faculty_id] = []
        tagMap[row.faculty_id].push(row.tag)
      }
      setTagsByFaculty(tagMap)
      setLoading(false)
    }
    load()
  }, [session])

  // Derive sorted unique units from loaded data
  const units = useMemo(() => {
    const set = new Set(faculty.map(f => f.unit).filter(Boolean))
    return [...set].sort()
  }, [faculty])

  // Derive cross-cutting tags (appear on 4+ faculty), sorted by frequency
  const popularTags = useMemo(() => {
    const count = {}
    Object.values(tagsByFaculty).forEach(tags =>
      tags.forEach(t => { count[t] = (count[t] ?? 0) + 1 })
    )
    return Object.entries(count)
      .filter(([, n]) => n >= 4)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [tagsByFaculty])

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  function clearTags() { setSelectedTags(new Set()) }

  // Client-side filter: name, title, bio, unit, tags (OR logic for multi-tag)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faculty.filter(f => {
      const matchesUnit = !selectedUnit || f.unit === selectedUnit
      const facTags = tagsByFaculty[f.id] ?? []
      const matchesTags = selectedTags.size === 0 || facTags.some(t => selectedTags.has(t))
      const matchesQuery = !q || [f.name, f.title, f.bio, f.unit, ...facTags]
        .some(field => field?.toLowerCase().includes(q))
      return matchesUnit && matchesTags && matchesQuery
    })
  }, [faculty, tagsByFaculty, query, selectedUnit, selectedTags])

  const hasFilters = query || selectedUnit || selectedTags.size > 0

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
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
          {/* Row 1: search + research topics dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search faculty…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent
                           placeholder:text-gray-400 bg-white"
              />
            </div>

            {popularTags.length > 0 && (
              <ResearchTopicsDropdown
                tags={popularTags}
                selectedTags={selectedTags}
                onToggle={toggleTag}
                onClear={clearTags}
              />
            )}
          </div>

          {/* Row 2: unit pills */}
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

          {/* Row 3: active topic chips */}
          {selectedTags.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-400 mr-1 flex-shrink-0">Filtering by</span>
              {[...selectedTags].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5
                             bg-crimson/8 text-crimson border border-crimson/20 hover:bg-crimson/15 transition-colors cursor-pointer"
                >
                  {tag}
                  <span className="text-crimson/50 text-sm leading-none">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearTags}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        {hasFilters && (
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {selectedUnit && <> in <span className="font-medium text-gray-700">{selectedUnit}</span></>}
            {selectedTags.size > 0 && (
              <> matching <span className="font-medium text-gray-700">
                {selectedTags.size === 1
                  ? `"${[...selectedTags][0]}"`
                  : `${selectedTags.size} research topics`}
              </span></>
            )}
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
                selectedTags={selectedTags}
                onTagClick={toggleTag}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No faculty matched your search.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setSelectedUnit(null); clearTags() }}
              className="mt-3 text-sm font-medium cursor-pointer text-crimson"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Research Topics dropdown ──────────────────────────────────────────────────

function ResearchTopicsDropdown({ tags, selectedTags, onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handle(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  const filtered = search.trim()
    ? tags.filter(t => t.toLowerCase().includes(search.trim().toLowerCase()))
    : tags

  const count = selectedTags.size
  const isActive = count > 0

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium
                    transition-colors cursor-pointer select-none ${
          isActive
            ? 'bg-crimson text-white border-crimson'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        Research Topics
        {isActive && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-xs font-bold">
            {count}
          </span>
        )}
        <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${isActive ? 'text-white/70' : 'text-gray-400'}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl border border-gray-200
                        shadow-lg z-20 overflow-hidden">

          {/* Search inside dropdown */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search topics…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-200
                           focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent
                           placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          {/* Tag list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length > 0 ? filtered.map(tag => (
              <label
                key={tag}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTags.has(tag)}
                  onChange={() => onToggle(tag)}
                  className="accent-crimson w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                />
                <span className={`text-sm leading-snug ${selectedTags.has(tag) ? 'text-crimson font-medium' : 'text-gray-700'}`}>
                  {tag}
                </span>
              </label>
            )) : (
              <p className="text-xs text-gray-400 text-center py-4">No topics match "{search}"</p>
            )}
          </div>

          {/* Footer: clear + count */}
          {count > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{count} selected</span>
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-crimson hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Faculty card ──────────────────────────────────────────────────────────────

function FacultyCard({ faculty: f, tags, selectedTags, onTagClick }) {
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
          className="self-start text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 text-white bg-crimson"
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
          <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold bg-crimson">
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

      {/* Research tag pills — clicking a tag toggles it in the filter */}
      {previewTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {previewTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={e => {
                e.preventDefault()
                onTagClick(tag)
              }}
              className={`text-[10px] font-medium rounded-full px-2 py-0.5 border cursor-pointer transition-colors ${
                selectedTags.has(tag)
                  ? 'bg-crimson text-white border-crimson'
                  : 'text-crimson border-crimson/30 bg-crimson/4'
              }`}
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
        <span className="text-xs font-medium flex-shrink-0 ml-auto text-crimson">
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
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border ${
        active
          ? 'bg-crimson text-white border-crimson'
          : 'bg-white text-gray-700 border-gray-300'
      }`}
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

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}
