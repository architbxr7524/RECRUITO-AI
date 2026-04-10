'use client'
import { useState, useEffect } from 'react'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem('recruito-auth') || '{}')?.state?.accessToken || '' }
    catch { return '' }
  }

  useEffect(() => {
    const token = getToken()
    const url = filter === 'all'
      ? `https://recruito-ai-production.up.railway.app/api/v1/jobs?limit=50`
      : `https://recruito-ai-production.up.railway.app/api/v1/jobs?limit=50&status=${filter}`
    fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => { setJobs(d.jobs || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: 0 }}>Jobs</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>{total} total positions</p>
        </div>
        <a href="/dashboard/jobs/new"
          style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          + New Job
        </a>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {['all', 'active', 'draft', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
              background: filter === s ? '#334155' : 'transparent', color: filter === s ? 'white' : '#64748b' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', height: '180px' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {jobs.map((job: any) => {
            const count = Number(job.candidateCount || job.candidate_count || job.applicantCount || job.applicant_count || 0)
            return (
              <div key={job.id}
                style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#334155')}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <a href={`/dashboard/jobs/${job.id}`}
                      style={{ fontSize: '15px', fontWeight: 700, color: 'white', textDecoration: 'none', display: 'block', marginBottom: '4px' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#60a5fa')}
                      onMouseOut={e => (e.currentTarget.style.color = 'white')}>
                      {job.title}
                    </a>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{job.department || 'No department'}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', marginLeft: '8px', flexShrink: 0,
                    background: job.status === 'active' ? 'rgba(6,78,59,0.5)' : '#1e293b',
                    color: job.status === 'active' ? '#34d399' : '#94a3b8' }}>
                    {job.status}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  📍 {job.location || 'Not specified'} · {job.remoteType || job.remote_type}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                  ⏱ {job.experienceMin || job.experience_min || 0}–{job.experienceMax || job.experience_max || 10} years exp
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    👥 <span style={{ color: 'white', fontWeight: 700 }}>{count}</span> candidates
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {job.status === 'draft' && (
                      <button onClick={async () => {
                        fetch(`https://recruito-ai-production.up.railway.app/api/v1/jobs/${job.id}/publish`, {
                          method: 'POST', headers: { Authorization: 'Bearer ' + getToken() }
                        })
                        setFilter(f => f)
                        window.location.reload()
                      }}
                        style={{ fontSize: '12px', background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                        Publish
                      </button>
                    )}
                    <a href={`/dashboard/pipeline/${job.id}`}
                      style={{ fontSize: '12px', color: '#94a3b8', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'white')}
                      onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>
                      Pipeline
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
          {!jobs.length && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              No jobs found. <a href="/dashboard/jobs/new" style={{ color: '#60a5fa' }}>Create one →</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}