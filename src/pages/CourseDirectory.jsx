import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth, useSavedCourses } from '../lib/hooks'
import { sanitizeDescription, groupCourseRows } from '../lib/utils'
import { SearchIcon, BookmarkIcon } from '../components/Icons'

// Short display labels for unit filter pills (mirrors Faculty.jsx)
const UNIT_ABBREV = {
  'Accounting & Management':                      'A&M',
  'Business, Government & the International Economy': 'BGIE',
  'Entrepreneurial Management':                   'EM',
  'Finance':                                      'Finance',
  'General Management':                           'GM',
  'Marketing':                                    'Marketing',
  'Negotiation, Organizations & Markets':         'NOM',
  'Organizational Behavior':                      'OB',
  'Strategy':                                     'Strategy',
  'Technology & Operations Management':           'TOM',
  'Health Care':                                  'Health Care',
  'Healthcare':                                   'Healthcare',
}

/** Extract the season keyword from a term string like "Fall 2026" → "Fall" */
function termSeason(term) {
  return term?.split(' ')[0] ?? ''
}

export default function CourseDirectory() {
  const session  = useRequireAuth()
  const { savedCourseIds, toggleSaveCourse } = useSavedCourses(session)

  const [rawRows, setRawRows]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [selectedUnit, setSelectedUnit]   = useState(null)
  const [selectedTerm, setSelectedTerm]   = useState(null)

  useEffect(() => {
    if (!session) return
    // Fetch all catalog courses with joined faculty data.
    // The catalog is ~126 grouped offerings; raw rows are ~150–200 after team-teaching.
    // Client-side filtering is fine at this scale; add pagination if the catalog grows.
    supabase
      .from('faculty_courses')
      .select('id, course_title, course_number, unit, term, quarter, credits, description, faculty_name, faculty_id, faculty(id, name, image_url)')
      .order('course_title')
      .then(({ data, error }) => {
        if (error) console.error('[CourseDirectory] load error:', error)
        setRawRows(data ?? [])
        setLoading(false)
      })
  }, [session])

  // Group raw rows into one card per logical course offering
  const grouped = useMemo(() => groupCourseRows(rawRows), [rawRows])

  // Distinct units (sorted)
  const units = useMemo(() => {
    const set = new Set(grouped.map(c => c.unit).filter(Boolean))
    return [...set].sort()
  }, [grouped])

  // Distinct term seasons (Fall / Spring / Winter / January, in calendar order)
  const TERM_ORDER = ['Fall', 'Winter', 'January', 'Spring']
  const terms = useMemo(() => {
    const set = new Set(grouped.map(c => termSeason(c.term)).filter(Boolean))
    return TERM_ORDER.filter(t => set.has(t))
  }, [grouped])

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return grouped.filter(c => {
      const matchesUnit = !selectedUnit || c.unit === selectedUnit
      const matchesTerm = !selectedTerm || termSeason(c.term) === selectedTerm
      const matchesQuery = !q ||
        c.course_title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.faculty.some(f => f.name?.toLowerCase().includes(q))
      return matchesUnit && matchesTerm && matchesQuery
    })
  }, [grouped, query, selectedUnit, selectedTerm])

  const hasFilters = query || selectedUnit || selectedTerm

  if (loading) return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="sticky top-14 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          <div className="h-9 bg-gray-100 rounded-lg animate-pulse w-full max-w-sm" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-7 w-16 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />

      {/* Sticky filter bar */}
      <div className="sticky top-14 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">

          {/* Search */}
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson transition"
            />
          </div>

          {/* Unit pills */}
          <div className="flex gap-1.5 flex-wrap">
            <UnitPill label="All" active={!selectedUnit} onClick={() => setSelectedUnit(null)} />
            {units.map(unit => (
              <UnitPill
                key={unit}
                label={UNIT_ABBREV[unit] ?? unit}
                active={selectedUnit === unit}
                onClick={() => setSelectedUnit(selectedUnit === unit ? null : unit)}
              />
            ))}
          </div>

          {/* Term pills */}
          {terms.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              <TermPill label="All terms" active={!selectedTerm} onClick={() => setSelectedTerm(null)} />
              {terms.map(t => (
                <TermPill
                  key={t}
                  label={t}
                  active={selectedTerm === t}
                  onClick={() => setSelectedTerm(selectedTerm === t ? null : t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results header */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {hasFilters
            ? `${filtered.length} course${filtered.length !== 1 ? 's' : ''} matching your filters`
            : `${filtered.length} courses`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSelectedUnit(null); setSelectedTerm(null) }}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Course grid */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500">No courses match your filters.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setSelectedUnit(null); setSelectedTerm(null) }}
              className="mt-2 text-sm font-medium text-crimson cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isSaved={savedCourseIds.has(course.id)}
                onSaveToggle={() => toggleSaveCourse(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function UnitPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer flex-shrink-0 ${
        active
          ? 'bg-crimson text-white border-crimson'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

function TermPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer flex-shrink-0 ${
        active
          ? 'bg-gray-800 text-white border-gray-800'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

function CourseCard({ course, isSaved, onSaveToggle }) {
  const desc = sanitizeDescription(course.description)
  const termLabel = [course.term, course.quarter].filter(Boolean).join(' · ')

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-crimson/30 hover:shadow-sm transition-all group">

      {/* Save button */}
      <button
        type="button"
        onClick={onSaveToggle}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors cursor-pointer ${
          isSaved
            ? 'text-crimson'
            : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-crimson'
        }`}
        title={isSaved ? 'Unsave course' : 'Save course'}
      >
        <BookmarkIcon filled={isSaved} className="w-4 h-4" />
      </button>

      {/* Title */}
      <div className="pr-6">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{course.course_title}</p>
        {course.course_number && (
          <p className="text-[11px] text-gray-400 mt-0.5">#{course.course_number}</p>
        )}
      </div>

      {/* Faculty */}
      {course.faculty.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {course.faculty.map((f, i) => (
            f.id ? (
              <Link
                key={f.id}
                to={`/faculty/${f.id}`}
                className="text-xs text-gray-500 hover:text-crimson transition-colors"
              >
                {f.name}{i < course.faculty.length - 1 ? ',' : ''}
              </Link>
            ) : (
              <span key={f.name} className="text-xs text-gray-400">
                {f.name}{i < course.faculty.length - 1 ? ',' : ''}
              </span>
            )
          ))}
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {course.unit && (
          <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 text-white bg-crimson">
            {UNIT_ABBREV[course.unit] ?? course.unit}
          </span>
        )}
        {termLabel && (
          <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border text-crimson border-crimson bg-crimson/6">
            {termLabel}
          </span>
        )}
        {course.credits != null && (
          <span className="text-[10px] text-gray-400 font-medium">{course.credits} cr</span>
        )}
      </div>

      {/* Description */}
      {desc && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{desc}</p>
      )}
    </div>
  )
}
