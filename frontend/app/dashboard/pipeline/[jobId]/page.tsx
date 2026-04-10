'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function PipelinePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem('recruito-auth') || '{}')?.state?.accessToken || '' }
    catch { return '' }
  }

  const load = () => {
    fetch(`http://${process.env.NEXT_PUBLIC_API_URL}/api/v1/pipeline/${jobId}`, {
      headers: { Authorization: 'Bearer ' + getToken() }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [jobId])

  const move = async (candidateId: string, toStageId: string) => {
    await fetch('http://${process.env.NEXT_PUBLIC_API_URL}/api/v1/pipeline/move', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, toStageId })
    })
    load()
  }

  if (loading) return <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>Loading...</div>
  if (!data) return <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>Not found</div>

  return (
    <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a href="/dashboard/pipeline" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Pipeline</a>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: '4px 0' }}>{data.job?.title}</h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {data.stats?.total} candidates · Avg: <b style={{ color: 'white' }}>{data.stats?.avgScore || '—'}</b>
          </div>
        </div>
        <a href={`/dashboard/jobs/${jobId}`}
          style={{ fontSize: '13px', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none' }}>
          + Upload Resumes
        </a>
      </div>

      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', flex: 1, paddingBottom: '16px' }}>
        {data.stages?.map((stage: any) => (
          <div key={stage.id} style={{ minWidth: '220px', display: 'flex', flexDirection: 'column' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (dragging) move(dragging, stage.id); setDragging(null) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{stage.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b', background: '#1e293b', padding: '1px 6px', borderRadius: '999px' }}>
                {stage.candidates?.length || 0}
              </span>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '10px', padding: '8px', minHeight: '300px', flex: 1 }}>
              {stage.candidates?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontSize: '12px' }}>Drop here</div>
              )}
              {stage.candidates?.map((c: any) => {
                const skills: string[] = typeof c.skills === 'string' ? JSON.parse(c.skills || '[]') : (c.skills || [])
                const score = Number(c.totalScore || c.total_score || 0)
                const scoreColor = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
                const name = c.fullName || c.full_name
                return (
                  <div key={c.id} draggable
                    onDragStart={() => setDragging(c.id)}
                    onDragEnd={() => setDragging(null)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', marginBottom: '8px', cursor: 'grab' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: name ? 'white' : '#64748b', fontStyle: name ? 'normal' : 'italic' }}>
                        {name || 'Parsing...'}
                      </span>
                      {score > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: scoreColor, background: scoreColor + '22', padding: '1px 6px', borderRadius: '4px' }}>
                          {score.toFixed(0)}
                        </span>
                      )}
                    </div>
                    {c.currentTitle && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{c.currentTitle}</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                      {skills.slice(0, 3).map((s: string) => (
                        <span key={s} style={{ fontSize: '9px', background: '#0f172a', color: '#94a3b8', padding: '2px 5px', borderRadius: '3px' }}>{s}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a href={`/dashboard/candidates/${c.id}`} style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>View →</a>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {data.stages?.find((s: any) => (s.stageType || s.stage_type) === 'rejected') && (
                          <button onClick={() => move(c.id, data.stages.find((s: any) => (s.stageType || s.stage_type) === 'rejected').id)}
                            style={{ fontSize: '10px', background: 'rgba(127,29,29,0.4)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 7px', borderRadius: '4px', cursor: 'pointer' }}>
                            Reject
                          </button>
                        )}
                        {data.stages?.find((s: any) => (s.stageType || s.stage_type) === 'hired') && (
                          <button onClick={() => move(c.id, data.stages.find((s: any) => (s.stageType || s.stage_type) === 'hired').id)}
                            style={{ fontSize: '10px', background: 'rgba(6,78,59,0.4)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '3px 7px', borderRadius: '4px', cursor: 'pointer' }}>
                            Hire
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}