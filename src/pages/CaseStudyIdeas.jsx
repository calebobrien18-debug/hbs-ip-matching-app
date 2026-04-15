import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'
import { initials } from '../lib/utils'

// Match strength styles (mirrors Matching.jsx — kept local to avoid shared-state coupling)
const STRENGTH_STYLES = {
  strong:      'bg-green-700 text-white',
  good:        'bg-green-100 text-green-800 border border-green-300',
  exploratory: 'bg-green-50 text-green-600 border border-green-200',
}
const STRENGTH_LABELS = {
  strong:      'Strong match',
  good:        'Good match',
  exploratory: 'Exploratory',
}

const GEN_MESSAGES = [
  'Reading faculty research areas…',
  'Reviewing your background…',
  'Connecting your experience to HBS pedagogy…',
  'Drafting case study concepts…',
  'Refining ideas for the classroom…',
]

const DAILY_LIMIT = 3

export default function CaseStudyIdeas() {
  const session = useRequireAuth()
  const { matchId } = useParams()

  const [matchData, setMatchData]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)

  const [userContext, setUserContext]   = useState('')
  const [generating, setGenerating]   = useState(false)
  const [genMsgIndex, setGenMsgIndex] = useState(0)
  const [ideas, setIdeas]             = useState([])
  const [genError, setGenError]       = useState(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  // Daily run counter for rate-limit UX
  const [ideasToday, setIdeasToday]   = useState(0)
  const limitReached = ideasToday >= DAILY_LIMIT

  // Saved ideas — Map<idea.title, saved_case_ideas.id | 'optimistic'>
  const [savedIdeaMap, setSavedIdeaMap]   = useState(new Map())
  const [savingIdeaTitle, setSavingIdeaTitle] = useState(null)  // title of in-flight save

  // ── Load match data + today's run count + existing saves ─────────────────────
  useEffect(() => {
    if (!session || !matchId) return
    async function load() {
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)

      const [{ data: match }, { count }, { data: savedRows }] = await Promise.all([
        supabase
          .from('faculty_matches')
          .select('*, faculty(id, name, unit, image_url, title, bio)')
          .eq('id', matchId)
          .maybeSingle(),
        supabase
          .from('case_idea_runs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('saved_case_ideas')
          .select('id, title')
          .eq('match_id', matchId)
          .eq('user_id', session.user.id),
      ])

      if (!match) { setNotFound(true); setLoading(false); return }
      setMatchData(match)
      setIdeasToday(count ?? 0)
      setSavedIdeaMap(new Map((savedRows ?? []).map(r => [r.title, r.id])))
      setLoading(false)
    }
    load()
  }, [session, matchId])

  // ── Cycle loading messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setGenMsgIndex(i => (i + 1) % GEN_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [generating])

  // ── Generate ideas ────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenError(null)
    setGenMsgIndex(0)
    setGenerating(true)

    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) throw new Error('No active session — please sign in again.')
      supabase.functions.setAuth(s.access_token)

      const { data, error, response } = await supabase.functions.invoke('generate-case-ideas', {
        body: { match_id: matchId, user_context: userContext.trim().slice(0, 1000) },
      })

      if (error) {
        let message = error.message
        try {
          const rawResponse = response ?? error.context
          if (rawResponse) {
            const body = await rawResponse.json()
            if (body?.error) message = body.error
          }
        } catch { /* fall back */ }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)

      const newIdeas = data.ideas ?? []
      setIdeas(newIdeas)
      setHasGenerated(true)
      // Optimistic increment so button disables immediately after 3rd run
      setIdeasToday(prev => Math.max(prev, data.runsToday ?? prev + 1))
      // Preserve saved state for ideas that still exist; clear orphaned titles
      setSavedIdeaMap(prev => {
        const next = new Map()
        for (const idea of newIdeas) {
          if (prev.has(idea.title)) next.set(idea.title, prev.get(idea.title))
        }
        return next
      })
    } catch (err) {
      console.error('Case idea generation error:', err)
      setGenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }, [matchId, userContext])

  // ── Save / unsave handlers ────────────────────────────────────────────────────
  const handleSaveIdea = useCallback(async (idea) => {
    if (!matchData?.faculty) return
    setSavingIdeaTitle(idea.title)
    // Optimistic
    setSavedIdeaMap(prev => new Map(prev).set(idea.title, 'optimistic'))

    const { data, error } = await supabase
      .from('saved_case_ideas')
      .insert({
        user_id:         session.user.id,
        match_id:        matchId,
        faculty_id:      matchData.faculty.id,
        title:           idea.title,
        premise:         idea.premise ?? null,
        protagonist:     idea.protagonist ?? null,
        teaching_themes: idea.teaching_themes ?? [],
        student_angle:   idea.student_angle ?? null,
        faculty_angle:   idea.faculty_angle ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Save idea error:', error)
      setSavedIdeaMap(prev => { const n = new Map(prev); n.delete(idea.title); return n })
    } else {
      setSavedIdeaMap(prev => new Map(prev).set(idea.title, data.id))
    }
    setSavingIdeaTitle(null)
  }, [session, matchId, matchData])

  const handleUnsaveIdea = useCallback(async (idea) => {
    const rowId = savedIdeaMap.get(idea.title)
    if (!rowId || rowId === 'optimistic') return
    // Optimistic
    setSavedIdeaMap(prev => { const n = new Map(prev); n.delete(idea.title); return n })
    const { error } = await supabase.from('saved_case_ideas').delete().eq('id', rowId)
    if (error) {
      console.error('Unsave idea error:', error)
      setSavedIdeaMap(prev => new Map(prev).set(idea.title, rowId))
    }
  }, [savedIdeaMap])

  // ── Loading / not-found states ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-gray-500">Match not found. It may have been deleted or doesn't belong to your account.</p>
        <Link to="/match" className="text-sm font-semibold text-crimson hover:opacity-70 transition-opacity">
          ← Back to matches
        </Link>
      </div>
    </div>
  )

  const f = matchData?.faculty

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Breadcrumb */}
        <Link
          to="/match"
          className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to matches
        </Link>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Case Study Idea Generator</h1>
          {f && (
            <p className="text-base text-gray-500 mt-1">with {f.name}</p>
          )}
        </div>

        {/* Explanation paragraph */}
        <p className="text-sm text-gray-600 leading-relaxed -mt-2">
          Use this tool to brainstorm HBS teaching case concepts you could co-develop
          with {f?.name ?? 'this faculty member'}. Each idea is tailored to your background
          and their published research. Steer the generator toward specific industries or
          topics, then save ideas you want to revisit.
        </p>

        {/* Compact faculty reference card */}
        {f && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {f.image_url ? (
                <img src={f.image_url} alt={f.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 bg-gray-100" />
              ) : (
                <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold bg-crimson text-sm">
                  {initials(f.name)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{f.name}</p>
                  {f.unit && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 text-white bg-crimson flex-shrink-0">
                      {f.unit}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${STRENGTH_STYLES[matchData.match_strength] ?? STRENGTH_STYLES.good}`}>
                    {STRENGTH_LABELS[matchData.match_strength] ?? 'Match'}
                  </span>
                </div>
                {f.title && <p className="text-xs text-gray-400 mt-0.5 truncate">{f.title}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Match context panel */}
        {matchData?.match_reasons?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Why you matched
            </h2>
            <ul className="space-y-1.5">
              {matchData.match_reasons.map((reason, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                  <span className="text-crimson font-bold flex-shrink-0 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>

            {matchData.collaboration_ideas?.length > 0 && (
              <details className="pt-2 border-t border-gray-100">
                <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 transition-colors">
                  Collaboration ideas that inspired this ▸
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {matchData.collaboration_ideas.map((idea, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 leading-snug">
                      <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">→</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Steering input + generate button */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Steer the generator{' '}
              <span className="font-normal text-gray-400">— optional</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Suggest industries, companies, regions, time periods, or themes you'd like the case ideas to explore.
            </p>
            <textarea
              rows={3}
              value={userContext}
              onChange={e => setUserContext(e.target.value)}
              disabled={generating || limitReached}
              placeholder={'e.g. "Private equity in Southeast Asia" or "founder-led turnarounds in retail"'}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || limitReached}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-opacity flex items-center justify-center gap-2 ${
              limitReached
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-crimson text-white cursor-pointer hover:opacity-90 disabled:opacity-60'
            }`}
          >
            <LightbulbIcon className="w-4 h-4" />
            {limitReached
              ? `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT})`
              : hasGenerated ? 'Regenerate ideas' : 'Generate case study ideas'}
          </button>

          {/* Runs remaining counter */}
          {!limitReached && (
            <p className="text-xs text-gray-400 text-center">
              {DAILY_LIMIT - ideasToday} generation{DAILY_LIMIT - ideasToday !== 1 ? 's' : ''} remaining today
            </p>
          )}
          {limitReached && (
            <p className="text-xs text-gray-400 text-center">
              Daily limit reached — resets at midnight UTC
            </p>
          )}
        </div>

        {/* Generating spinner */}
        {generating && (
          <div className="text-center py-8 space-y-3">
            <div className="w-10 h-10 rounded-full border-[3px] border-crimson/20 border-t-crimson animate-spin mx-auto" />
            <p className="text-sm text-gray-500 h-5 transition-all">{GEN_MESSAGES[genMsgIndex]}</p>
          </div>
        )}

        {/* Error banner */}
        {genError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {genError}
          </div>
        )}

        {/* Ideas */}
        {!generating && ideas.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {ideas.length} case study idea{ideas.length !== 1 ? 's' : ''}
            </h2>
            {ideas.map((idea, i) => (
              <IdeaCard
                key={i}
                idea={idea}
                index={i}
                isSaved={savedIdeaMap.has(idea.title)}
                isSaving={savingIdeaTitle === idea.title}
                onSave={() => handleSaveIdea(idea)}
                onUnsave={() => handleUnsaveIdea(idea)}
              />
            ))}
          </div>
        )}

        {/* Empty state after generation */}
        {!generating && hasGenerated && ideas.length === 0 && !genError && (
          <div className="text-center py-10 text-sm text-gray-400">
            No ideas were generated. Try adding more context above and regenerating.
          </div>
        )}

      </div>
    </div>
  )
}

// ── Idea card ──────────────────────────────────────────────────────────────────

function IdeaCard({ idea, index, isSaved, isSaving, onSave, onUnsave }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

      {/* Number + title + bookmark */}
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <h3 className="text-base font-semibold text-gray-900 leading-snug flex-1">{idea.title}</h3>
        <button
          type="button"
          onClick={isSaved ? onUnsave : onSave}
          disabled={isSaving}
          title={isSaved ? 'Remove from saved ideas' : 'Save this idea to Dashboard'}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
            isSaved
              ? 'text-crimson bg-crimson/6 hover:bg-crimson/10'
              : 'text-gray-300 hover:text-crimson hover:bg-crimson/6'
          }`}
        >
          <BookmarkIcon filled={isSaved} className="w-4 h-4" />
        </button>
      </div>

      {/* Protagonist chip */}
      {idea.protagonist && (
        <span className="inline-block text-[11px] font-semibold rounded-full px-3 py-0.5 border border-slate-200 text-slate-600 bg-slate-50">
          {idea.protagonist}
        </span>
      )}

      {/* Premise */}
      <p className="text-sm text-gray-700 leading-relaxed">{idea.premise}</p>

      <div className="border-t border-gray-100 pt-4 space-y-4">

        {/* Teaching themes */}
        {idea.teaching_themes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Teaching themes</p>
            <div className="flex flex-wrap gap-2">
              {idea.teaching_themes.map((theme, j) => (
                <span key={j}
                  className="text-xs font-medium rounded-full px-3 py-1 border border-blue-200 text-blue-700 bg-blue-50">
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

        {/* Faculty angle */}
        {idea.faculty_angle && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Faculty connection</p>
            <p className="text-sm text-gray-700 leading-snug">{idea.faculty_angle}</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function LightbulbIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a7 7 0 0 1 5.468 11.37c-.592.772-1.468 1.7-1.468 2.63v1a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-1c0-.93-.876-1.858-1.468-2.63A7 7 0 0 1 12 2Zm-2 15h4v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1Z" />
    </svg>
  )
}

function BookmarkIcon({ filled, className }) {
  return filled ? (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}
