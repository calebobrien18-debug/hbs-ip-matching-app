import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { useRequireAuth } from '../lib/hooks'

export default function ProfileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [resumeUrl, setResumeUrl] = useState(null)
  const [linkedinPdfUrl, setLinkedinPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const session = useRequireAuth()

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data } = await supabase
        .from('hbs_ip')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      // RLS ensures this is null if the row belongs to another user
      if (!data) { setNotFound(true); setLoading(false); return }

      setProfile(data)

      // Generate signed URLs in parallel
      const storage = supabase.storage.from('student-files')
      const [resumeSigned, linkedinSigned] = await Promise.all([
        data.resume_path        ? storage.createSignedUrl(data.resume_path, 3600)        : Promise.resolve({ data: null }),
        data.linkedin_pdf_path  ? storage.createSignedUrl(data.linkedin_pdf_path, 3600)  : Promise.resolve({ data: null }),
      ])
      setResumeUrl(resumeSigned.data?.signedUrl ?? null)
      setLinkedinPdfUrl(linkedinSigned.data?.signedUrl ?? null)

      setLoading(false)
    }
    load()
  }, [session, id])

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this profile? This cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)

    // Remove uploaded files from storage first
    const toRemove = [profile.resume_path, profile.linkedin_pdf_path].filter(Boolean)
    if (toRemove.length) {
      await supabase.storage.from('student-files').remove(toRemove)
    }

    await supabase.from('hbs_ip').delete().eq('id', id)
    navigate('/dashboard', { replace: true })
  }

  if (loading) return null

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-gray-500">Profile not found.</p>
          <button onClick={() => navigate('/dashboard')}
            className="text-sm font-medium cursor-pointer" style={{ color: '#A51C30' }}>
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-4 flex items-center gap-1">
            ← Back to dashboard
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/profile/edit')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {/* HBS details */}
        <Section title="HBS details">
          <Row label="Program">
            {profile.program}
            {profile.program === 'Other' && profile.program_other && (
              <span className="text-gray-400"> — {profile.program_other}</span>
            )}
          </Row>
          <Row label="Graduation year">{profile.graduation_year && `Class of ${profile.graduation_year}`}</Row>
          <Row label="Section">{profile.hbs_section && `Section ${profile.hbs_section}`}</Row>
        </Section>

        {/* Research profile */}
        <Section title="Research profile">
          <Row label="Professional interests" block>{profile.professional_interests}</Row>
          <Row label="Faculty in mind" block>{profile.faculty_in_mind}</Row>
          <Row label="LinkedIn">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: '#A51C30' }}>
                {profile.linkedin_url}
              </a>
            )}
          </Row>
          <Row label="Personal websites" block>
            {profile.website_urls && profile.website_urls.split('\n').filter(Boolean).map((url, i) => (
              <a key={i} href={url.trim()} target="_blank" rel="noreferrer"
                className="block underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: '#A51C30' }}>
                {url.trim()}
              </a>
            ))}
          </Row>
        </Section>

        {/* Additional background */}
        {profile.additional_background && (
          <Section title="Additional background">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {profile.additional_background}
            </p>
          </Section>
        )}

        {/* Uploads */}
        <Section title="Uploads">
          <Row label="Resume">
            {resumeUrl
              ? <FileLink href={resumeUrl} label="Download resume" />
              : <span className="text-gray-400">Not uploaded</span>}
          </Row>
          <Row label="LinkedIn PDF">
            {linkedinPdfUrl
              ? <FileLink href={linkedinPdfUrl} label="Download LinkedIn PDF" />
              : <span className="text-gray-400">Not uploaded</span>}
          </Row>
        </Section>

        {/* Metadata */}
        <p className="text-xs text-gray-400 text-right">
          Last updated {new Date(profile.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

      </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({ label, block, children }) {
  if (!children || (Array.isArray(children) && children.every(c => !c))) return null
  return (
    <div className={`py-2.5 ${block ? 'space-y-0.5' : 'flex items-baseline gap-4'}`}>
      <span className={`text-xs font-medium text-gray-400 uppercase tracking-wide ${block ? 'block' : 'w-36 flex-shrink-0'}`}>
        {label}
      </span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  )
}

function FileLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
      style={{ color: '#A51C30' }}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      {label}
    </a>
  )
}
