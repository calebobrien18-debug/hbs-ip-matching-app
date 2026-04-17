import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../lib/hooks'
import NavBar from '../components/NavBar'

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
  })
}

export default function AdminFeedback() {
  const navigate  = useNavigate()
  const isAdmin   = useIsAdmin()
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [lightbox, setLightbox]   = useState(null)  // signed URL string | null

  // Redirect non-admins once the check resolves
  useEffect(() => {
    if (isAdmin === false) navigate('/dashboard', { replace: true })
  }, [isAdmin, navigate])

  // Fetch feedback once confirmed admin
  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('feedback')
      .select('id, created_at, user_email, message, screenshot_url')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[AdminFeedback] fetch error:', error)
        setRows(data ?? [])
        setLoading(false)
      })
  }, [isAdmin])

  async function openScreenshot(storagePath) {
    const { data, error } = await supabase.storage
      .from('feedback-screenshots')
      .createSignedUrl(storagePath, 60 * 60) // 1-hour expiry
    if (error) { console.error('[AdminFeedback] signed URL error:', error); return }
    setLightbox(data.signedUrl)
  }

  // Still checking auth
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Feedback Log</h1>
          {!loading && (
            <span className="text-sm text-gray-400">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">No feedback yet.</div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <FeedbackCard
                key={row.id}
                row={row}
                onOpenScreenshot={openScreenshot}
              />
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Feedback screenshot"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Single feedback card ───────────────────────────────────────────────────────

function FeedbackCard({ row, onOpenScreenshot }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = row.message.length > 300

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 space-y-2.5">

      {/* Meta row */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-gray-500">
          {row.user_email ?? <span className="italic text-gray-300">unknown user</span>}
        </span>
        <span className="text-xs text-gray-300 shrink-0">{formatDate(row.created_at)}</span>
      </div>

      {/* Message */}
      <div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {isLong && !expanded
            ? row.message.slice(0, 300) + '…'
            : row.message}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="mt-1 text-xs text-crimson hover:opacity-70 transition-opacity cursor-pointer"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Screenshot thumbnail */}
      {row.screenshot_url && (
        <button
          type="button"
          onClick={() => onOpenScreenshot(row.screenshot_url)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="group-hover:underline underline-offset-2">View screenshot</span>
        </button>
      )}
    </div>
  )
}
