import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRequireAuth, useSavedFaculty } from '../lib/hooks'
import { initials, formatFacultyTitle } from '../lib/utils'
import NavBar from '../components/NavBar'
import { EMAIL_DAILY_LIMIT } from '../lib/constants'
import { TrashIcon, EnvelopeIcon, ClipboardIcon, CheckIcon, BookmarkIcon } from '../components/Icons'
import { invokeEdgeFunction } from '../lib/edgeFunction'
import { trackEvent } from '../lib/analytics'

const FACULTY_STATUS_OPTIONS = [
  { value: 'interested',  label: 'Interested',   style: 'bg-gray-100 text-gray-600' },
  { value: 'researching', label: 'Researching',  style: 'bg-blue-100 text-blue-700' },
  { value: 'top_choice',  label: 'Top choice',   style: 'bg-crimson/10 text-crimson' },
  { value: 'emailed',     label: 'Emailed',      style: 'bg-green-100 text-green-700' },
  { value: 'not_now',     label: 'Not now',      style: 'bg-gray-50 text-gray-400 italic' },
]

export default function SavedIdeas() {
  const session = useRequireAuth()
  const { statusMap, updateStatus } = useSavedFaculty(session)
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [emailsToday, setEmailsToday] = useState(0)

  // Saved drafts: array of saved_email_drafts rows keyed by faculty
  const [savedDrafts, setSavedDrafts] = useState([])
  const [savingDraftFid, setSavingDraftFid] = useState(null)
  const [deletingDraftIds, setDeletingDraftIds] = useState(new Set())

  // Per-faculty draft panel state: { [facultyId]: { open, selectedIds, loading, subject, body, error, copied, savedDraftId } }
  const [draftStates, setDraftStates] = useState({})

  useEffect(() => {
    if (!session) return
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('saved_case_ideas')
        .select('id, match_id, title, premise, protagonist, teaching_themes, student_angle, faculty_angle, created_at, faculty:faculty_id(id, name, image_url, title)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('email_draft_runs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('saved_email_drafts')
        .select('id, faculty_id, idea_ids, subject, body, tone, created_at, updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false }),
    ]).then(([{ data, error }, { count }, { data: draftsData, error: draftsError }]) => {
      if (error) console.error('[SavedIdeas] ideas load error:', error)
      if (draftsError) console.error('[SavedIdeas] drafts load error:', draftsError)
      setIdeas(data ?? [])
      setEmailsToday(count ?? 0)
      setSavedDrafts(draftsData ?? [])
      setLoading(false)
    })
  }, [session])

  // Group ideas by faculty
  const facultyGroups = useMemo(() => {
    const map = {}
    for (const idea of ideas) {
      const key = idea.faculty?.id ?? 'unknown'
      if (!map[key]) map[key] = { faculty: idea.faculty, ideas: [] }
      map[key].ideas.push(idea)
    }
    return Object.values(map)
  }, [ideas])

  // ── Delete handlers ───────────────────────────────────────────────────────────
  async function handleDelete(ideaId) {
    setDeletingIds(prev => new Set(prev).add(ideaId))
    setIdeas(prev => prev.filter(i => i.id !== ideaId))
    const { error } = await supabase.from('saved_case_ideas').delete().eq('id', ideaId)
    if (error) {
      console.error('[SavedIdeas] delete error:', error)
      supabase
        .from('saved_case_ideas')
        .select('id, match_id, title, premise, protagonist, teaching_themes, student_angle, faculty_angle, created_at, faculty:faculty_id(id, name, image_url, title)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setIdeas(data ?? []))
    }
    setDeletingIds(prev => { const next = new Set(prev); next.delete(ideaId); return next })
  }

  // ── Saved draft CRUD ─────────────────────────────────────────────────────────

  async function handleSaveDraft(fid) {
    const state = getDraftState(fid)
    if (!state.subject && !state.body) return

    const tone = state.tone ?? 'warm'

    // If a draft for this faculty+tone already exists and the user hasn't yet
    // confirmed the replace, surface the inline confirmation and stop here.
    if (!state.confirmReplace) {
      const existing = savedDrafts.find(d => d.faculty_id === fid && d.tone === tone)
      if (existing) {
        patchDraftState(fid, { confirmReplace: existing.id })
        return
      }
    }

    setSavingDraftFid(fid)
    const ideaIds = [...(state.selectedIds ?? [])]

    if (state.confirmReplace) {
      // Update the existing draft in place
      const { data, error } = await supabase
        .from('saved_email_drafts')
        .update({ subject: state.subject, body: state.body, tone, idea_ids: ideaIds, updated_at: new Date().toISOString() })
        .eq('id', state.confirmReplace)
        .select('id, faculty_id, idea_ids, subject, body, tone, created_at, updated_at')
        .single()

      if (error) {
        console.error('[SavedIdeas] replace draft error:', error)
      } else {
        setSavedDrafts(prev => prev.map(d => d.id === state.confirmReplace ? data : d))
        trackEvent('email_draft_saved', { tone, replaced: true })
      }
    } else {
      // Insert new draft
      const row = { user_id: session.user.id, faculty_id: fid, idea_ids: ideaIds, subject: state.subject, body: state.body, tone }
      const { data, error } = await supabase
        .from('saved_email_drafts')
        .insert(row)
        .select('id, faculty_id, idea_ids, subject, body, tone, created_at, updated_at')
        .single()

      if (error) {
        console.error('[SavedIdeas] save draft error:', error)
      } else {
        setSavedDrafts(prev => [data, ...prev])
        trackEvent('email_draft_saved', { tone })
      }
    }

    patchDraftState(fid, { confirmReplace: null })
    setSavingDraftFid(null)
  }

  async function handleDeleteSavedDraft(draftId) {
    setDeletingDraftIds(prev => new Set(prev).add(draftId))
    setSavedDrafts(prev => prev.filter(d => d.id !== draftId))
    const { error } = await supabase.from('saved_email_drafts').delete().eq('id', draftId)
    if (error) {
      console.error('[SavedIdeas] delete draft error:', error)
      supabase
        .from('saved_email_drafts')
        .select('id, faculty_id, idea_ids, subject, body, tone, created_at, updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .then(({ data }) => setSavedDrafts(data ?? []))
    }
    setDeletingDraftIds(prev => { const next = new Set(prev); next.delete(draftId); return next })
  }

  // ── Draft panel state helpers ─────────────────────────────────────────────────
  function getDraftState(fid) {
    return draftStates[fid] ?? {
      open: false,
      selectedIds: null,   // null = not yet initialized (use all by default on first open)
      loading: false,
      subject: '', body: '', error: null, copied: false,
      tone: 'warm',
    }
  }

  function patchDraftState(fid, patch) {
    setDraftStates(prev => ({ ...prev, [fid]: { ...getDraftState(fid), ...patch } }))
  }

  const handleToggleDraftPanel = useCallback((fid, groupIdeas) => {
    const state = getDraftState(fid)
    if (state.open) {
      patchDraftState(fid, { open: false })
    } else {
      // Pre-select all ideas in this group on first open
      const selectedIds = state.selectedIds ?? new Set(groupIdeas.map(i => i.id))
      patchDraftState(fid, { open: true, selectedIds })
    }
  }, [draftStates])

  const handleToggleDraftIdea = useCallback((fid, ideaId) => {
    const state = getDraftState(fid)
    const prev = state.selectedIds ?? new Set()
    const next = new Set(prev)
    if (next.has(ideaId)) next.delete(ideaId)
    else next.add(ideaId)
    patchDraftState(fid, { selectedIds: next })
  }, [draftStates])

  const handleGenerateDraft = useCallback(async (fid) => {
    const state = getDraftState(fid)
    patchDraftState(fid, { loading: true, error: null, subject: '', body: '' })

    try {
      const data = await invokeEdgeFunction('generate-email-draft', {
        faculty_id: fid,
        idea_ids: [...(state.selectedIds ?? [])],
        tone: state.tone ?? 'warm',
      })

      patchDraftState(fid, { subject: data.subject ?? '', body: data.body ?? '', loading: false })
      setEmailsToday(prev => Math.max(prev, data.draftsToday ?? prev + 1))
      trackEvent('email_draft_generated', { tone: state.tone ?? 'warm' })
    } catch (err) {
      console.error('Email draft error:', err)
      patchDraftState(fid, { error: err.message || 'Something went wrong.', loading: false })
    }
  }, [draftStates])

  const handleCopyDraft = useCallback((fid) => {
    const state = getDraftState(fid)
    const text = state.subject
      ? `Subject: ${state.subject}\n\n${state.body}`
      : state.body
    navigator.clipboard.writeText(text).then(() => {
      trackEvent('email_copied')
      patchDraftState(fid, { copied: true })
      setTimeout(() => patchDraftState(fid, { copied: false }), 2000)
    })
  }, [draftStates])

  // ─────────────────────────────────────────────────────────────────────────────

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <NavBar />
      <div className="px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-8">

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
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Generate more ideas →
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
            </div>
          ) : ideas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <p className="text-sm font-medium text-gray-600">No saved ideas yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Go to your matches, click <span className="font-medium">Case study ideas</span> on any match card, and save the concepts worth pursuing.
              </p>
              <Link to="/match" className="mt-4 inline-block text-sm font-medium text-crimson">
                Go to your matches →
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {facultyGroups.map(({ faculty: fac, ideas: groupIdeas }) => {
                const fid = fac?.id ?? 'unknown'
                const draft = getDraftState(fid)
                const emailLimitReached = emailsToday >= EMAIL_DAILY_LIMIT
                const groupIdeasForDraft = groupIdeas.map(i => ({ id: i.id, title: i.title, premise: i.premise, student_angle: i.student_angle }))
                const selectedIds = draft.selectedIds ?? new Set(groupIdeas.map(i => i.id))

                return (
                  <div key={fid} className="space-y-3">

                    {/* Faculty group header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {fac?.image_url ? (
                          <img src={fac.image_url} alt={fac.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold bg-crimson">
                            {initials(fac?.name ?? '?')}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{fac?.name ?? 'Unknown faculty'}</p>
                          {fac?.title && <p className="text-xs text-gray-400 truncate">{formatFacultyTitle(fac.title)}</p>}
                        </div>
                        {/* Status picker */}
                        {fac?.id && (() => {
                          const currentStatus = statusMap.get(fac.id) ?? 'interested'
                          const currentOption = FACULTY_STATUS_OPTIONS.find(o => o.value === currentStatus) ?? FACULTY_STATUS_OPTIONS[0]
                          return (
                            <select
                              value={currentStatus}
                              onChange={e => updateStatus(fac.id, e.target.value)}
                              className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-crimson/30 flex-shrink-0 ${currentOption.style}`}
                            >
                              {FACULTY_STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          )
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleDraftPanel(fid, groupIdeasForDraft)}
                        title={emailLimitReached ? `${EMAIL_DAILY_LIMIT}/${EMAIL_DAILY_LIMIT} email drafts used today` : `Draft an outreach email to ${fac?.name ?? 'this professor'}`}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                          draft.open
                            ? 'bg-crimson/8 border-crimson/20 text-crimson'
                            : emailLimitReached
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-crimson/40 hover:text-crimson'
                        }`}
                      >
                        <EnvelopeIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {draft.open
                            ? 'Close'
                            : emailLimitReached
                              ? 'Draft email'
                              : emailsToday > 0
                                ? `Draft email (${EMAIL_DAILY_LIMIT - emailsToday} left)`
                                : 'Draft email'}
                        </span>
                      </button>
                    </div>

                    {/* Draft panel */}
                    {draft.open && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Draft outreach email to {fac?.name}
                          </h3>
                          {!emailLimitReached && (
                            <span className="text-xs text-gray-400">
                              {EMAIL_DAILY_LIMIT - emailsToday} draft{EMAIL_DAILY_LIMIT - emailsToday !== 1 ? 's' : ''} remaining today
                            </span>
                          )}
                        </div>

                        {emailLimitReached && (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                            You've used all {EMAIL_DAILY_LIMIT} email drafts for today. Resets at midnight UTC. Your saved ideas are here when you're ready tomorrow.
                          </div>
                        )}

                        {/* Pre-draft tips */}
                        {!draft.body && !draft.loading && !emailLimitReached && (
                          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
                            <p className="text-xs font-semibold text-gray-600">A strong outreach email includes:</p>
                            <ul className="text-xs text-gray-500 space-y-1 pl-1">
                              <li>• A specific reason you're reaching out to <em>this</em> professor</li>
                              <li>• One concrete connection to their work</li>
                              <li>• A clear, low-friction ask (e.g. 20-min call)</li>
                              <li>• Under 200 words</li>
                            </ul>
                          </div>
                        )}

                        {/* Idea checklist */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Ideas to include in your email
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedIds.size === groupIdeas.length) {
                                  patchDraftState(fid, { selectedIds: new Set() })
                                } else {
                                  patchDraftState(fid, { selectedIds: new Set(groupIdeas.map(i => i.id)) })
                                }
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              {selectedIds.size === groupIdeas.length ? 'Deselect all' : 'Select all'}
                            </button>
                          </div>

                          {groupIdeas.map(idea => (
                            <label
                              key={idea.id}
                              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(idea.id)}
                                onChange={() => handleToggleDraftIdea(fid, idea.id)}
                                className="mt-0.5 accent-crimson flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 leading-snug">{idea.title}</p>
                                {idea.premise && (
                                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{idea.premise}</p>
                                )}
                              </div>
                            </label>
                          ))}

                          {/* Tone presets */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-400 flex-shrink-0">Tone:</span>
                            {['formal', 'warm', 'concise'].map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => patchDraftState(fid, { tone: t })}
                                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors capitalize ${
                                  (draft.tone ?? 'warm') === t
                                    ? 'bg-crimson text-white border-crimson'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleGenerateDraft(fid)}
                            disabled={draft.loading || selectedIds.size === 0 || emailLimitReached}
                            className="w-full mt-2 py-2.5 rounded-xl font-semibold text-sm transition-opacity flex items-center justify-center gap-2 bg-crimson text-white cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {draft.loading ? (
                              <>
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Drafting your email…
                              </>
                            ) : (
                              <>
                                <EnvelopeIcon className="w-4 h-4" />
                                Generate draft
                              </>
                            )}
                          </button>
                        </div>

                        {/* Error */}
                        {draft.error && (
                          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {draft.error}
                          </div>
                        )}

                        {/* Draft result */}
                        {(draft.subject || draft.body) && (
                          <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Subject
                              </label>
                              <input
                                type="text"
                                value={draft.subject}
                                onChange={e => patchDraftState(fid, { subject: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Body
                              </label>
                              <textarea
                                value={draft.body}
                                onChange={e => patchDraftState(fid, { body: e.target.value })}
                                rows={12}
                                className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson"
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopyDraft(fid)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer bg-gray-900 text-white hover:bg-gray-700"
                              >
                                {draft.copied ? (
                                  <>
                                    <CheckIcon className="w-4 h-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <ClipboardIcon className="w-4 h-4" />
                                    Copy to clipboard
                                  </>
                                )}
                              </button>
                              {draft.confirmReplace ? (
                                <div className="inline-flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">Replace existing {draft.tone ?? 'warm'} draft?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveDraft(fid)}
                                    disabled={savingDraftFid === fid}
                                    className="px-3 py-1.5 rounded-lg font-semibold border bg-crimson text-white border-crimson hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {savingDraftFid === fid ? 'Replacing…' : 'Replace'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => patchDraftState(fid, { confirmReplace: null })}
                                    className="px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSaveDraft(fid)}
                                  disabled={savingDraftFid === fid}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer border-gray-200 text-gray-600 hover:border-crimson/40 hover:text-crimson disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <BookmarkIcon filled={false} className="w-4 h-4" />
                                  {savingDraftFid === fid ? 'Saving…' : 'Save draft'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ideas for this faculty */}
                    <ul className="space-y-3">
                      {groupIdeas.map(idea => (
                        <li key={idea.id}>
                          <SavedIdeaCard
                            idea={idea}
                            deleting={deletingIds.has(idea.id)}
                            onDelete={() => handleDelete(idea.id)}
                          />
                        </li>
                      ))}
                    </ul>

                    {/* Saved drafts for this faculty */}
                    {(() => {
                      const facDrafts = savedDrafts.filter(d => d.faculty_id === fid)
                      if (facDrafts.length === 0) return null
                      return (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Saved drafts ({facDrafts.length})
                          </p>
                          <ul className="space-y-2">
                            {facDrafts.map(d => (
                              <li key={d.id}>
                                <SavedDraftCard
                                  draft={d}
                                  deleting={deletingDraftIds.has(d.id)}
                                  onDelete={() => handleDeleteSavedDraft(d.id)}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Saved draft card ──────────────────────────────────────────────────────────

function SavedDraftCard({ draft, deleting, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const savedDate = new Date(draft.updated_at || draft.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(o => !o)}
          className="flex-1 text-left min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800 leading-snug truncate">
              {draft.subject || '(No subject)'}
            </p>
            <span className="text-[10px] font-medium capitalize rounded-full px-2 py-0.5 bg-gray-100 text-gray-500 flex-shrink-0">
              {draft.tone}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{savedDate}</span>
          </div>
          {!expanded && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{draft.body}</p>
          )}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardIcon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title="Delete saved draft"
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            {deleting
              ? <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
              : <TrashIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          {draft.subject && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Subject: <span className="font-normal normal-case text-gray-700">{draft.subject}</span>
            </p>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
        </div>
      )}
    </div>
  )
}

// ── Saved idea card ────────────────────────────────────────────────────────────

function SavedIdeaCard({ idea, deleting, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

      {/* Match link + delete */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/case-ideas/${idea.match_id}`}
          className="text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Generate more ideas →
        </Link>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Remove saved idea"
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-40"
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

          {idea.student_angle && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your angle as co-author</p>
              <p className="text-sm text-gray-700 leading-snug">{idea.student_angle}</p>
            </div>
          )}

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


