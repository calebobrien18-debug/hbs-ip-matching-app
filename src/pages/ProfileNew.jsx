import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'
import { extractPdfText } from '../lib/pdf'

const HBS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const PROGRAMS = ['MBA', 'Executive Education', 'Other']

function gradYears() {
  const min = 2026
  const max = new Date().getFullYear() + 3
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

export default function ProfileNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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

  const session = useRequireAuth()

  useEffect(() => {
    if (!session) return
    const meta = session.user.user_metadata
    const fullName = meta?.full_name || meta?.name || ''
    const [first = '', ...rest] = fullName.split(' ')
    setForm(f => ({ ...f, first_name: first, last_name: rest.join(' '), email: session.user.email ?? '' }))
    setLoading(false)
  }, [session])

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id

      let resume_path = null
      if (resumeFile) {
        const { error: err } = await supabase.storage.from('student-files')
          .upload(`${userId}/resume.pdf`, resumeFile, { upsert: true })
        if (err) throw err
        resume_path = `${userId}/resume.pdf`
      }

      let linkedin_pdf_path = null
      if (linkedinPdfFile) {
        const { error: err } = await supabase.storage.from('student-files')
          .upload(`${userId}/linkedin.pdf`, linkedinPdfFile, { upsert: true })
        if (err) throw err
        linkedin_pdf_path = `${userId}/linkedin.pdf`
      }

      const { error: insertError } = await supabase.from('hbs_ip').insert({
        user_id: userId,
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
        resume_path, linkedin_pdf_path,
        resume_text: resumeText || null,
        linkedin_text: linkedinText || null,
      })
      if (insertError) throw insertError
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
          <h1 className="text-2xl font-semibold text-gray-900">Create your profile</h1>
          <p className="text-sm text-gray-500 mt-1">This helps us match you with the right faculty.</p>
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
          />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <button type="submit" disabled={saving}
            className={`w-full py-3 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${saving ? 'bg-gray-400' : 'bg-crimson'}`}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}

// ── Shared form sections ────────────────────────────────────────────────────

export function PersonalSection({ form, set }) {
  return (
    <section className={card}>
      <h2 className={heading}>Personal info</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" required>
          <input type="text" required value={form.first_name} onChange={set('first_name')} className={inputCls} />
        </Field>
        <Field label="Last name" required>
          <input type="text" required value={form.last_name} onChange={set('last_name')} className={inputCls} />
        </Field>
      </div>
      <Field label="Email" required>
        <input type="email" required value={form.email} onChange={set('email')} className={inputCls} />
      </Field>
    </section>
  )
}

export function HBSSection({ form, set }) {
  return (
    <section className={card + ' space-y-5'}>
      <h2 className={heading}>HBS details</h2>
      <Field label="Program">
        <div className="flex flex-col gap-2 mt-1">
          {PROGRAMS.map(p => (
            <label key={p} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="program" value={p} checked={form.program === p}
                onChange={set('program')} className="accent-crimson w-4 h-4 cursor-pointer" />
              <span className="text-sm text-gray-800">{p}</span>
            </label>
          ))}
        </div>
        {form.program === 'Other' && (
          <input type="text" placeholder="Please describe your program"
            value={form.program_other} onChange={set('program_other')} className={inputCls + ' mt-3'} />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Graduation year" required>
          <select required value={form.graduation_year} onChange={set('graduation_year')} className={inputCls}>
            <option value="">Select year</option>
            {gradYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={form.hbs_section} onChange={set('hbs_section')} className={inputCls}>
            <option value="">Select section</option>
            {HBS_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </section>
  )
}

export function ResearchSection({ form, set }) {
  return (
    <section className={card}>
      <h2 className={heading}>Research profile</h2>
      <Field label="Professional interests">
        <textarea rows={4}
          placeholder="Describe your professional interests, industry or sector focus, and what kind of projects you're hoping to pursue…"
          value={form.professional_interests} onChange={set('professional_interests')}
          className={inputCls + ' resize-none'} />
      </Field>
      <Field label="Faculty in mind" hint="optional">
        <textarea rows={2}
          placeholder="List any HBS faculty you already have in mind, separated by commas or new lines…"
          value={form.faculty_in_mind} onChange={set('faculty_in_mind')}
          className={inputCls + ' resize-none'} />
      </Field>
      <Field label="LinkedIn profile URL">
        <input type="url" placeholder="https://linkedin.com/in/yourname"
          value={form.linkedin_url} onChange={set('linkedin_url')} className={inputCls} />
      </Field>
      <Field label="Personal websites or portfolios" hint="optional">
        <textarea rows={2}
          placeholder="Paste any relevant URLs — personal site, GitHub, research page, etc. One per line."
          value={form.website_urls} onChange={set('website_urls')}
          className={inputCls + ' resize-none'} />
      </Field>
    </section>
  )
}

export function UploadsSection({
  form, set,
  setResumeFile, setLinkedinPdfFile,
  onResumeText, onLinkedinText,
  existingResume, existingLinkedinPdf,
  hasExistingResumeText, hasExistingLinkedinText,
}) {
  const [resumeState, setResumeState]   = useState('idle')   // idle | extracting | done | error
  const [linkedinState, setLinkedinState] = useState('idle')

  async function handleFileChange(file, setFile, onText, setExtractState) {
    setFile(file ?? null)
    if (!file) { setExtractState('idle'); onText?.(''); return }
    setExtractState('extracting')
    try {
      const text = await extractPdfText(file)
      onText?.(text)
      setExtractState('done')
    } catch (err) {
      console.error('PDF text extraction failed:', err)
      setExtractState('error')
    }
  }

  return (
    <section className={card}>
      <div>
        <h2 className={heading}>
          Uploads <span className="text-gray-400 font-normal normal-case tracking-normal">— optional</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Your resume and LinkedIn PDF are the primary inputs for our matching algorithm.
          Uploading both gives the system a complete picture of your background and
          significantly improves the relevance of your faculty matches.
        </p>
      </div>

      <Field label="Resume" hint="PDF only">
        {existingResume && resumeState === 'idle' && (
          <UploadedBadge label="Resume previously uploaded" hasText={hasExistingResumeText} />
        )}
        <input type="file" accept=".pdf"
          onChange={e => handleFileChange(e.target.files[0], setResumeFile, onResumeText, setResumeState)}
          className={fileCls} />
        <ExtractionStatus state={resumeState} />
      </Field>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-700">LinkedIn PDF export</span>
          <InfoTooltip>
            <p className="font-semibold mb-1.5">How to export your LinkedIn profile as a PDF:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to your LinkedIn profile page</li>
              <li>Click the <strong>Resources</strong> button below your profile photo and headline</li>
              <li>Select <strong>Save to PDF</strong> from the dropdown menu</li>
              <li>The PDF will download automatically to your device</li>
            </ol>
            <p className="mt-1.5 text-gray-400">
              This exports your full profile including experience, education, and skills — much richer than a URL alone.
            </p>
          </InfoTooltip>
        </div>
        {existingLinkedinPdf && linkedinState === 'idle' && (
          <UploadedBadge label="LinkedIn PDF previously uploaded" hasText={hasExistingLinkedinText} />
        )}
        <input type="file" accept=".pdf"
          onChange={e => handleFileChange(e.target.files[0], setLinkedinPdfFile, onLinkedinText, setLinkedinState)}
          className={fileCls} />
        <ExtractionStatus state={linkedinState} />
      </div>

      <Field label="Additional background" hint="optional">
        <textarea rows={3}
          placeholder="Share anything relevant to the matching process that isn't captured in your resume or LinkedIn — e.g. research you've done outside of work, personal projects, languages, lived experiences, or areas of curiosity you're actively exploring…"
          value={form.additional_background} onChange={set('additional_background')}
          className={inputCls + ' resize-none'} />
      </Field>
    </section>
  )
}

function ExtractionStatus({ state }) {
  if (state === 'idle') return null
  if (state === 'extracting') return (
    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
      Extracting text for matching…
    </p>
  )
  if (state === 'done') return (
    <p className="text-xs text-green-700 mt-1">✓ Text extracted — this file will be used for matching</p>
  )
  if (state === 'error') return (
    <p className="text-xs text-amber-600 mt-1">Could not extract text from this PDF. The file will still be uploaded.</p>
  )
  return null
}

// ── Shared UI primitives ────────────────────────────────────────────────────

function UploadedBadge({ label, hasText }) {
  return (
    <div className="mb-1.5 space-y-1">
      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1 inline-flex items-center gap-1">
        <span>✓</span> {label} — upload a new file to replace it
      </p>
      {!hasText && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 inline-flex items-center gap-1">
          ⚠ Re-upload this file so we can extract its text for matching
        </p>
      )}
    </div>
  )
}

function InfoTooltip({ children }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button type="button"
        onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)} onBlur={() => setVisible(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        aria-label="More information">
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {visible && (
        <div className="absolute left-6 top-0 z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-xs text-gray-600">
          {children}
        </div>
      )}
    </span>
  )
}

export function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1.5">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent ' +
  'placeholder:text-gray-400'

export const fileCls =
  'w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 ' +
  'file:rounded-md file:border-0 file:text-sm file:font-medium ' +
  'file:bg-gray-100 file:text-gray-700 file:cursor-pointer ' +
  'hover:file:bg-gray-200 cursor-pointer'

const card = 'bg-white rounded-xl border border-gray-200 p-6 space-y-4'
const heading = 'text-sm font-semibold text-gray-700 uppercase tracking-wide'
