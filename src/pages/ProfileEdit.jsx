import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  PersonalSection, HBSSection, ResearchSection, UploadsSection,
} from './ProfileNew.jsx'
import NavBar from '../components/NavBar'

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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/', { replace: true }); return }

      const { data: profile } = await supabase
        .from('hbs_ip')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!profile) { navigate('/profile/new', { replace: true }); return }

      setExistingResume(!!profile.resume_path)
      setExistingLinkedinPdf(!!profile.linkedin_pdf_path)
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
    })
  }, [navigate])

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
          resume_path, linkedin_pdf_path,
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
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-4 flex items-center gap-1">
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
            existingResume={existingResume}
            existingLinkedinPdf={existingLinkedinPdf}
          />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: saving ? '#9ca3af' : '#A51C30' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
