'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const BACKEND = 'https://recruito-ai-production.up.railway.app/api/v1'

export default function PublicJobPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${BACKEND}/jobs/public/${jobId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setJob)
      .catch(() => setNotFound(true))
  }, [jobId])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('candidateName', form.name)
      formData.append('candidateEmail', form.email)
       const res = await fetch(`${BACKEND}/resumes/upload/public?jobId=${jobId}&candidateName=${encodeURIComponent(form.name)}&candidateEmail=${encodeURIComponent(form.email)}`, 
      {
        method: 'POST',
        body: formData   // remove the Content-Type header — browser sets it with boundary automatically
      }
)
  
      if (!res.ok) throw new Error('Upload failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#060910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2>Job not found or no longer active</h2>
      </div>
    </div>
  )

  if (!job) return (
    <div style={{ minHeight: '100vh', background: '#060910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#7d8590' }}>Loading...</div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#060910', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#e6edf3', fontSize: 28, fontWeight: 800 }}>Application Submitted!</h2>
        <p style={{ color: '#7d8590', fontSize: 16 }}>We'll review your resume and reach out soon.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#060910', color: '#e6edf3', fontFamily: 'Inter,sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(48,64,92,0.4)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#2f81f7,#a371f7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>R</div>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Recruito AI</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Job Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {job.employment_type && <span style={{ background: 'rgba(47,129,247,0.15)', color: '#2f81f7', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{job.employment_type}</span>}
            {job.remote_type && <span style={{ background: 'rgba(163,113,247,0.15)', color: '#a371f7', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{job.remote_type}</span>}
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{job.title}</h1>
          <div style={{ display: 'flex', gap: 20, color: '#7d8590', fontSize: 15, flexWrap: 'wrap' }}>
            {job.location && <span>📍 {job.location}</span>}
            {job.experience_min !== null && <span>🧑‍💼 {job.experience_min}–{job.experience_max} years exp</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left — Job Details */}
          <div>
            <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)', borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>About the Role</h2>
              <p style={{ color: '#c9d1d9', lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{job.description}</p>
            </div>
            {job.requirements && (
              <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)', borderRadius: 16, padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Requirements</h2>
                <p style={{ color: '#c9d1d9', lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{job.requirements}</p>
              </div>
            )}
          </div>

          {/* Right — Apply Form */}
          <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)', borderRadius: 16, padding: 28, height: 'fit-content', position: 'sticky', top: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 24 }}>Apply Now</h2>
            <form onSubmit={handleApply}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#c9d1d9', marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                <input
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required placeholder="John Doe"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(22,27,39,0.8)', border: '1px solid rgba(48,64,92,0.8)', borderRadius: 8, color: '#e6edf3', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#c9d1d9', marginBottom: 6, fontWeight: 500 }}>Email Address</label>
                <input
                  type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required placeholder="john@example.com"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(22,27,39,0.8)', border: '1px solid rgba(48,64,92,0.8)', borderRadius: 8, color: '#e6edf3', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#c9d1d9', marginBottom: 6, fontWeight: 500 }}>Resume (PDF)</label>
                <div style={{ border: '2px dashed rgba(48,64,92,0.8)', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
                  onClick={() => document.getElementById('resume-input')?.click()}>
                  <input id="resume-input" type="file" accept=".pdf" style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files?.[0] || null)} required />
                  {file
                    ? <p style={{ color: '#2f81f7', fontSize: 13, margin: 0 }}>📄 {file.name}</p>
                    : <p style={{ color: '#7d8590', fontSize: 13, margin: 0 }}>Click to upload PDF resume</p>}
                </div>
              </div>
              {error && <p style={{ color: '#f85149', fontSize: 13, marginBottom: 16 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 12, background: loading ? 'rgba(47,129,247,0.5)' : 'linear-gradient(135deg,#2f81f7,#1f6feb)', border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Submitting...' : 'Submit Application →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}