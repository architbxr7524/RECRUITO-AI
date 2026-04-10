'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('recruito-auth') || '{}')
      return s.state?.accessToken || ''
    } catch { return '' }
  }

  useEffect(() => {
    const token = getToken()
    const url = search
      ? `http://${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates?search=${encodeURIComponent(search)}`
      : `http://${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates?limit=50`
    fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => { setCandidates(d.candidates || []); setTotal(d.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search])

  const getScoreColor = (score: number) => {
    if (score >= 75) return { background: 'rgba(6,78,59,0.4)', color: '#34d399' }
    if (score >= 50) return { background: 'rgba(92,51,6,0.4)', color: '#fbbf24' }
    return { background: 'rgba(127,29,29,0.4)', color: '#f87171' }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: 0 }}>Candidates</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>{total} total candidates</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', outline: 'none' }}
          placeholder="Search by name or email..."
        />
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No candidates yet</div>
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Upload resumes to a job to see candidates here.</div>
          <a href="/dashboard/jobs" style={{ color: '#60a5fa', fontSize: '14px' }}>Go to Jobs →</a>
        </div>
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Candidate', 'Skills', 'Stage', 'AI Score', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: h === 'AI Score' || h === 'Action' ? 'right' : 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c: any) => {
                const skills: string[] = typeof c.skills === 'string' ? JSON.parse(c.skills || '[]') : (c.skills || [])
                const score = Number(c.totalScore || c.total_score || 0)
                const name = c.fullName || c.full_name
                const title = c.currentTitle || c.current_title
                const stageName = c.stageName || c.stage_name
                const stageColor = c.stageColor || c.stage_color || '#64748b'
                const initials = name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.5)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: name ? 'white' : '#64748b', fontStyle: name ? 'normal' : 'italic' }}>
                            {name || 'Parsing...'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{title || c.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {skills.slice(0, 3).map((skill: string) => (
                          <span key={skill} style={{ fontSize: '10px', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>{skill}</span>
                        ))}
                        {skills.length > 3 && <span style={{ fontSize: '10px', color: '#64748b' }}>+{skills.length - 3}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {stageName ? (
                        <span style={{ fontSize: '12px', fontWeight: 500, padding: '4px 10px', borderRadius: '999px', background: stageColor + '22', color: stageColor }}>
                          {stageName}
                        </span>
                      ) : <span style={{ fontSize: '12px', color: '#475569' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {score > 0 ? (
                        <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', padding: '4px 8px', borderRadius: '6px', ...getScoreColor(score) }}>
                          {score.toFixed(0)}/100
                        </span>
                      ) : <span style={{ fontSize: '12px', color: '#475569' }}>Scoring...</span>}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <a href={`/dashboard/candidates/${c.id}`}
                        style={{ fontSize: '12px', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none' }}>
                        View →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}