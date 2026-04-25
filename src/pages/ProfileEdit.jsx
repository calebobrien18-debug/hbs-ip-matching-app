import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRequireAuth } from '../lib/hooks'
import {
  PersonalSection, HBSSection, ResearchSection, UploadsSection,
} from './ProfileNew.jsx'
import NavBar from '../components/NavBar'

function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function InputQualityBadge({ text, label }) {
  const wc = wordCount(text)
  if (!text || wc === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
        <span>✗</span> {label} — missing
      </span>
    )
  }
  if (wc < 100) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
        <span>⚠</span> {label} — limited ({wc} words)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
      <span>✓</span> {label} — strong ({wc} words)
    </span>
  )
}

const LS_KEY_INPUTS_OPEN = 'profound_match_inputs_open'

function MatchingInputsPanel({ resumeText, linkedinText, topicsToExplore, onTopicsChange }) {
  const [open, setOpen] = useState(() => localStorage.getItem(LS_KEY_INPUTS_OPEN) === '1')
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false)
  const [linkedinPreviewOpen, setLinkedinPreviewOpen] = useState(false)

  function toggleOpen() {
    const next = !open
    setOpen(next)
    localStorage.setItem(LS_KEY_INPUTS_OPEN, next ? '1' : '0')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">Matching inputs</p>
          <p className="text-xs text-gray-500 mt-0.5">What the AI uses to find your faculty matches</p>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {/* Resume */}
          <div className="space-y-1.5 pt-4">
            <InputQualityBadge text={resumeText} label="Resume text" />
            {resumeText && (
              <div>
                <button
                  type="button"
                  onClick={() => setResumePreviewOpen(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  {resumePreviewOpen ? 'Hide preview' : 'Preview extracted text'}
                </button>
                {resumePreviewOpen && (
                  <pre className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-24 overflow-hidden whitespace-pre-wrap leading-relaxed">
                    {resumeText.slice(0, 500)}{resumeText.length > 500 ? '…' : ''}
                  </pre>
                )}
              </div>
            )}
            {!resumeText && (
              <p className="text-xs text-gray-400">Upload a resume above to improve your matches.</p>
            )}
          </div>

          {/* LinkedIn */}
          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <InputQualityBadge text={linkedinText} label="LinkedIn text" />
            {linkedinText && (
              <div>
                <button
                  type="button"
                  onClick={() => setLinkedinPreviewOpen(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  {linkedinPreviewOpen ? 'Hide preview' : 'Preview extracted text'}
                </button>
                {linkedinPreviewOpen && (
                  <pre className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-24 overflow-hidden whitespace-pre-wrap leading-relaxed">
                    {linkedinText.slice(0, 500)}{linkedinText.length > 500 ? '…' : ''}
                  </pre>
                )}
              </div>
            )}
            {!linkedinText && (
              <p className="text-xs text-gray-400">Upload a LinkedIn PDF above to add professional context.</p>
            )}
          </div>

          {/* Topics to explore */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Topics I want to explore at HBS
              <span className="font-normal text-gray-400 ml-1">(optional — supplements your resume for matching)</span>
            </label>
            <textarea
              value={topicsToExplore}
              onChange={e => onTopicsChange(e.target.value)}
              rows={3}
              placeholder="e.g. climate tech policy, impact investing in emerging markets, healthcare innovation"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson/50 placeholder:text-gray-400"
            />
            <p className="text-[11px] text-gray-400">This is sent to the AI alongside your resume and interests when finding matches.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [existingResume, setExistingResume] = useState(false)
  const [existingLinkedinPdf, setExistingLinkedinPdf] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    program: '', program_other: '',
    graduation_year: '', hbs_section: '',
    professional_interests: '', faculty_in_mind: '',
    linkedin_url: '', website_urls: '',
    additional_background: '',
  })
  const [resumeFile, setResumeFile] = useState(null)
  const [linkedinPdfFile, setLinkedinPdfFile] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [topicsToExplore, setTopicsToExplore] = useState('')

  const session = useRequireAuth()

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data: profile } = await supabase
        .from('hbs_ip')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!profile) { navigate('/profile/new', { replace: true }); return }

      setExistingResume(!!profile.resume_path)
      setExistingLinkedinPdf(!!profile.linkedin_pdf_path)
      // Pre-load previously extracted text so it isn't lost if user doesn't re-upload
      setResumeText(profile.resume_text ?? '')
      setLinkedinText(profile.linkedin_text ?? '')
      setTopicsToExplore(profile.topics_to_explore ?? '')
      setForm({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        email: profile.email ?? '',
        program: profile.program ?? '',
        program_other: profile.program_other ?? '',
        graduation_year: profile.graduation_year?.toString() ?? '',
        hbs_section: profile.hbs_section ?? '',
        professional_interests: profile.professional_interests ?? '',
        faculty_in_mind: profile.faculty_in_mind ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        website_urls: profile.website_urls ?? '',
        additional_background: profile.additional_background ?? '',
      })
      setLoading(false)
    }
    load()
  }, [session, navigate])

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id

      let resume_path = existingResume ? `${userId}/resume.pdf` : null
      if (resumeFile) {
        const { error: err } = await supabase.storage.from('student-files')
          .upload(`${userId}/resume.pdf`, resumeFile, { upsert: true })
        if (err) throw err
        resume_path = `${userId}/resume.pdf`
      }

      let linkedin_pdf_path = existingLinkedinPdf ? `${userId}/linkedin.pdf` : null
      if (linkedinPdfFile) {
        const { error: err } = await supabase.storage.from('student-files')
          .upload(`${userId}/linkedin.pdf`, linkedinPdfFile, { upsert: true })
        if (err) throw err
        linkedin_pdf_path = `${userId}/linkedin.pdf`
      }

      const { error: updateError } = await supabase
        .from('hbs_ip')
        .update({
          first_name: form.first_name.trim(), last_name: form.last_name.trim(),
          email: form.email.trim(),
          program: form.program || null,
          program_other: form.program === 'Other' ? form.program_other.trim() || null : null,
          graduation_year: parseInt(form.graduation_year, 10),
          hbs_section: form.hbs_section || null,
          professional_interests: form.professional_interests.trim() || null,
          faculty_in_mind: form.faculty_in_mind.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          website_urls: form.website_urls.trim() || null,
          additional_background: form.additional_background.trim() || null,
          topics_to_explore: topicsToExplore.trim() || null,
          resume_path, linkedin_pdf_path,
          resume_text: resumeText || null,
          linkedin_text: linkedinText || null,
        })
        .eq('user_id', userId)

      if (updateError) throw updateError
      navigate('/dashboard')
    } catch (err) {
      setError(err.message); setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-4 flex items-center gap-1">
            ← Back to dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Edit your profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your previous responses are pre-filled below. Update any fields you'd like to change and save when you're done.
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Previously uploaded files are saved — only upload a new file if you want to replace an existing one.
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <PersonalSection form={form} set={set} />
          <HBSSection form={form} set={set} />
          <ResearchSection form={form} set={set} />
          <UploadsSection
            form={form} set={set}
            setResumeFile={setResumeFile}
            setLinkedinPdfFile={setLinkedinPdfFile}
            onResumeText={setResumeText}
            onLinkedinText={setLinkedinText}
            existingResume={existingResume}
            existingLinkedinPdf={existingLinkedinPdf}
            hasExistingResumeText={!!resumeText}
            hasExistingLinkedinText={!!linkedinText}
          />

          <MatchingInputsPanel
            resumeText={resumeText}
            linkedinText={linkedinText}
            topicsToExplore={topicsToExplore}
            onTopicsChange={setTopicsToExplore}
          />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <button type="submit" disabled={saving}
            className={`w-full py-3 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${saving ? 'bg-gray-400' : 'bg-crimson'}`}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
