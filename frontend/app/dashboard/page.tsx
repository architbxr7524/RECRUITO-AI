'use client'
import { useEffect, useRef } from 'react'

export default function DashboardPage() {
  const statsRef = useRef<HTMLDivElement>(null)
  const jobsRef = useRef<HTMLDivElement>(null)
  const greetRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('recruito-auth')
    if (!stored) return
    const { state } = JSON.parse(stored)
    const token = state.accessToken
    const name = state.user?.fullName?.split(' ')[0] || 'there'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    if (greetRef.current) greetRef.current.textContent = greeting + ', ' + name + ' 👋'

    fetch(`https://recruito-ai-production.up.railway.app/api/v1/analytics/overview`, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json()).then(d => {
      if (!statsRef.current) return
      statsRef.current.innerHTML = `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px">
          <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          </div>
          <div style="font-size:28px;font-weight:900;color:white">${d.activeJobs}</div>
          <div style="font-size:14px;color:#94a3b8;margin-top:4px">Active Jobs</div>
        </div>
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px">
          <div style="width:36px;height:36px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div style="font-size:28px;font-weight:900;color:white">${d.totalCandidates}</div>
          <div style="font-size:14px;color:#94a3b8;margin-top:4px">Total Candidates</div>
        </div>
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px">
          <div style="width:36px;height:36px;background:#059669;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div style="font-size:28px;font-weight:900;color:white">${d.newThisWeek}</div>
          <div style="font-size:14px;color:#94a3b8;margin-top:4px">New This Week</div>
        </div>
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px">
          <div style="width:36px;height:36px;background:#d97706;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div style="font-size:28px;font-weight:900;color:white">${d.creditsRemaining}</div>
          <div style="font-size:14px;color:#94a3b8;margin-top:4px">Credits Remaining</div>
        </div>
      `
    }).catch(() => {})

    fetch(`https://recruito-ai-production.up.railway.app/api/v1/jobs?limit=5`, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json()).then(d => {
      if (!jobsRef.current) return
      const jobs = d.jobs || []
      if (!jobs.length) {
        jobsRef.current.innerHTML = '<div style="padding:32px;text-align:center;color:#64748b;font-size:14px">No jobs yet. <a href="/dashboard/jobs/new" style="color:#60a5fa">Create your first job</a></div>'
        return
      }
      jobsRef.current.innerHTML = jobs.map((j: any) => `
        <a href="/dashboard/jobs/${j.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #1e293b;text-decoration:none">
          <div>
            <div style="font-size:14px;font-weight:600;color:white">${j.title}</div>
            <div style="font-size:12px;color:#64748b">${j.department || 'No dept'} · ${j.location || 'Remote'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:12px;color:#94a3b8">${Number(j.candidateCount || j.candidate_count || 0)} candidates</span>
            <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;${j.status === 'active' ? 'background:rgba(6,78,59,0.5);color:#34d399' : 'background:#1e293b;color:#94a3b8'}">${j.status}</span>
          </div>
        </a>
      `).join('')
    }).catch(() => {})
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 ref={greetRef} style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: 0 }}>Welcome 👋</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Here is what is happening with your hiring pipeline.</p>
      </div>

      <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#475569' }}>—</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Active Jobs</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#475569' }}>—</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Total Candidates</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#475569' }}>—</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>New This Week</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#475569' }}>—</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Credits Remaining</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>Recent Jobs</span>
            <a href="/dashboard/jobs" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}>View all →</a>
          </div>
          <div ref={jobsRef}>
            <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '14px' }}>Loading...</div>
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: '14px', marginBottom: '16px' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a href="/dashboard/jobs/new" style={{ display: 'block', padding: '10px 16px', borderRadius: '8px', background: '#2563eb', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>+ Post a new job</a>
            <a href="/dashboard/candidates" style={{ display: 'block', padding: '10px 16px', borderRadius: '8px', background: '#334155', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>View all candidates</a>
            <a href="/dashboard/pipeline" style={{ display: 'block', padding: '10px 16px', borderRadius: '8px', background: '#334155', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Open pipeline</a>
            <a href="/dashboard/analytics" style={{ display: 'block', padding: '10px 16px', borderRadius: '8px', background: '#334155', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>View analytics</a>
          </div>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>How to use</div>
            <ol style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '16px', lineHeight: '2' }}>
              <li>Create a job and publish it</li>
              <li>Upload resumes on the job page</li>
              <li>AI scores each candidate</li>
              <li>View candidates by score</li>
              <li>Move candidates through pipeline</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}