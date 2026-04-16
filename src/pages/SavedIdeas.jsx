import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRequireAuth } from '../lib/hooks'
import { initials } from '../lib/utils'
import NavBar from '../components/NavBar'

export default function SavedIdeas() {
  const session = useRequireAuth()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState(new Set())

  useEffect(() => {
    if (!session) return
    supabase
      .from('saved_case_ideas')
      .select('id, match_id, title, premise, protagonist, teaching_themes, student_angle, faculty_angle, created_at, faculty:faculty_id(id, name, image_url, title)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[SavedIdeas] load error:', error)
        setIdeas(data ?? [])
        setLoading(false)
      })
  }, [session])

  async function handleDelete(ideaId) {
    setDeletingIds(prev => new Set(prev).add(ideaId))
    setIdeas(prev => prev.filter(i => i.id !== ideaId))   // optimistic
    const { error } = await supabase.from('saved_case_ideas').delete().eq('id', ideaId)
    if (error) {
      console.error('[SavedIdeas] delete error:', error)
      // re-fetch to restore state on failure
      supabase
        .from('saved_case_ideas')
        .select('id, match_id, title, premise, protagonist, teaching_themes, student_angle, faculty_angle, created_at, faculty:faculty_id(id, name, image_url, title)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setIdeas(data ?? []))
    }
    setDeletingIds(prev => { const next = new Set(prev); next.delete(ideaId); return next })
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/dashboard"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-1 inline-flex items-center gap-1"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">Saved Case Study Ideas</h1>
            </div>
            <Link
              to="/match"
              className="text-sm font-medium text-crimson hover:opacity-70 transition-opacity"
            >
              Generate more →
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
            </div>
          ) : ideas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <p className="text-sm text-gray-500">No saved ideas yet.</p>
              <Link to="/match" className="mt-3 inline-block text-sm font-medium text-crimson">
                Explore your matches to generate ideas →
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {ideas.map(idea => (
                <li key={idea.id}>
                  <SavedIdeaCard
                    idea={idea}
                    deleting={deletingIds.has(idea.id)}
                    onDelete={() => handleDelete(idea.id)}
                  />
                </li>
              ))}
            </ul>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Saved idea card ────────────────────────────────────────────────────────────

function SavedIdeaCard({ idea, deleting, onDelete }) {
  const fac = idea.faculty

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

      {/* Faculty row + delete button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {fac?.image_url ? (
            <img
              src={fac.image_url}
              alt={fac.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 bg-gray-100"
            />
          ) : (
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-semibold bg-crimson">
              {initials(fac?.name ?? '?')}
            </div>
          )}
          {fac?.name && (
            <span className="text-xs text-gray-500 truncate">with {fac.name}</span>
          )}
          <Link
            to={`/case-ideas/${idea.match_id}`}
            className="text-xs font-medium text-crimson hover:opacity-70 transition-opacity flex-shrink-0"
          >
            Generate more →
          </Link>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Remove saved idea"
          className="p-1.5 rounded-lg text-gray-300 hover:text-crimson hover:bg-crimson/6 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-40"
        >
          {deleting ? (
            <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 leading-snug">{idea.title}</h3>

      {/* Protagonist chip */}
      {idea.protagonist && (
        <span className="inline-block text-[11px] font-semibold rounded-full px-3 py-0.5 border border-slate-200 text-slate-600 bg-slate-50">
          {idea.protagonist}
        </span>
      )}

      {/* Premise */}
      {idea.premise && (
        <p className="text-sm text-gray-700 leading-relaxed">{idea.premise}</p>
      )}

      {(idea.teaching_themes?.length > 0 || idea.student_angle || idea.faculty_angle) && (
        <div className="border-t border-gray-100 pt-4 space-y-4">

          {/* Teaching themes */}
          {idea.teaching_themes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Teaching themes</p>
              <div className="flex flex-wrap gap-2">
                {idea.teaching_themes.map((theme, i) => (
                  <span key={i} className="text-xs font-medium rounded-full px-3 py-1 border border-blue-200 text-blue-700 bg-blue-50">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student angle */}
          {idea.student_angle && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your angle as co-author</p>
              <p className="text-sm text-gray-700 leading-snug">{idea.student_angle}</p>
            </div>
          )}

          {/* Faculty connection */}
          {idea.faculty_angle && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Faculty connection</p>
              <p className="text-sm text-gray-700 leading-snug">{idea.faculty_angle}</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function TrashIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
    </svg>
  )
}
