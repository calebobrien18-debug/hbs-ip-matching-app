import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Site footer.
 *
 * Props:
 *   showFeedback — if true, shows the "Share feedback" link (post-login pages only)
 */
export default function Footer({ showFeedback = false }) {
  const [open, setOpen] = useState(false)

  return (
    <footer className="w-full border-t border-gray-100 bg-white py-3 px-4 flex items-center justify-center gap-4 flex-shrink-0">
      <p className="text-xs text-gray-400">© 2026 ProFound, LLC. All rights reserved.</p>

      {showFeedback && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors cursor-pointer"
        >
          Share feedback
        </button>
      )}

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </footer>
  )
}

// ── Feedback Modal ─────────────────────────────────────────────────────────────

function FeedbackModal({ onClose }) {
  const [message, setMessage]   = useState('')
  const [status, setStatus]     = useState('idle')   // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in.')

      const { error } = await supabase.from('feedback').insert({
        user_id: session.user.id,
        message: message.trim().slice(0, 2000),
      })
      if (error) throw error

      setStatus('success')
      // Auto-close after 2 seconds
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      console.error('Feedback submit error:', err)
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Share Feedback</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {status === 'success' ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Thanks for your feedback!</p>
              <p className="text-xs text-gray-400">Your message has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 leading-relaxed">
                We'd love to hear how ProFound is working for you — or how it could be better.
              </p>

              <textarea
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={status === 'submitting'}
                placeholder="Share your thoughts, suggestions, or bug reports…"
                maxLength={2000}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson placeholder:text-gray-300 disabled:bg-gray-50"
              />

              {status === 'error' && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'submitting' || !message.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-crimson text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send feedback →'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function XIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
