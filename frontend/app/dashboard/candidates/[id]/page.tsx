'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, MessageSquare } from 'lucide-react'

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Strong Yes' : score >= 50 ? 'Maybe' : 'No'
  return (
    <div className="text-center shrink-0">
      <div className="text-5xl font-black" style={{ color }}>{score.toFixed(0)}</div>
      <div className="text-slate-400 text-xs mt-1">out of 100</div>
      <div className="mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block" style={{ background: color + '22', color }}>
        {label}
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-white">{pct.toFixed(0)}/100</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'score' | 'notes' | 'history'>('score')
  const [noteContent, setNoteContent] = useState('')
  const [noteRating, setNoteRating] = useState(0)
  const [saving, setSaving] = useState(false)

  const getToken = () => {
    const t = localStorage.getItem('accessToken')
    if (t) return t
    try {
      const s = JSON.parse(localStorage.getItem('recruito-auth') || '{}')
      return s.state?.accessToken || ''
    } catch { return '' }
  }

  const loadCandidate = () => {
    const token = getToken()
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => { if (d) setCandidate(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCandidate() }, [id])

  const addNote = async () => {
    if (!noteContent.trim()) return
    setSaving(true)
    await fetch(`http://${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/${id}/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent, noteType: 'note', rating: noteRating || undefined })
    })
    loadCandidate()
    setNoteContent('')
    setNoteRating(0)
    setSaving(false)
  }

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-slate-800 rounded w-1/3" />
      <div className="h-48 bg-slate-900 rounded-xl border border-slate-800" />
    </div>
  )

  if (notFound || !candidate) return (
    <div className="p-6 max-w-5xl mx-auto text-center py-20">
      <div className="text-4xl mb-4">🔍</div>
      <div className="text-white font-bold text-lg mb-2">Candidate not found</div>
      <div className="text-slate-400 text-sm mb-6">This candidate may have been deleted or you don't have access.</div>
      <Link href="/dashboard/candidates" className="text-blue-400 text-sm hover:text-blue-300">← Back to Candidates</Link>
    </div>
  )

  const skills: string[] = typeof candidate.skills === 'string'
    ? JSON.parse(candidate.skills || '[]') : (candidate.skills || [])

  const score = candidate.score
  const totalScore = Number(score?.totalScore || score?.total_score || 0)
  const semanticScore = Number(score?.semanticScore || score?.semantic_score || 0)
  const skillScore = Number(score?.skillMatchScore || score?.skill_match_score || 0)
  const expScore = Number(score?.experienceScore || score?.experience_score || 0)
  const eduScore = Number(score?.educationScore || score?.education_score || 0)
  const senScore = Number(score?.seniorityScore || score?.seniority_score || 0)

  const strengths: string[] = (() => {
    const s = score?.strengths
    if (!s) return []
    return typeof s === 'string' ? JSON.parse(s) : s
  })()

  const concerns: string[] = (() => {
    const c = score?.concerns
    if (!c) return []
    return typeof c === 'string' ? JSON.parse(c) : c
  })()

  const gaps: string[] = (() => {
    const g = score?.skillGaps || score?.skill_gaps
    if (!g) return []
    return typeof g === 'string' ? JSON.parse(g) : g
  })()

  const initials = candidate.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/candidates"
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition w-fit">
        <ArrowLeft size={14} /> Back to Candidates
      </Link>

      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-full flex items-center justify-center shrink-0 text-xl font-black text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white">
              {candidate.fullName || 'Unknown Candidate'}
            </h1>
            <div className="text-slate-400 text-sm mt-0.5">
              {candidate.currentTitle || 'No title'} {candidate.currentCompany ? `at ${candidate.currentCompany}` : ''}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              {candidate.email && (
                <span className="flex items-center gap-1"><Mail size={11} />{candidate.email}</span>
              )}
              {candidate.phone && (
                <span className="flex items-center gap-1"><Phone size={11} />{candidate.phone}</span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1"><MapPin size={11} />{candidate.location}</span>
              )}
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((skill: string) => (
                  <span key={skill} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          {score && totalScore > 0 && <ScoreRing score={totalScore} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-5">
        {(['score', 'notes', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
              activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {tab}{tab === 'notes' ? ` (${candidate.notes?.length || 0})` : ''}
          </button>
        ))}
      </div>

      {/* Score Tab */}
      {activeTab === 'score' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="font-bold text-white mb-4 text-sm">Score Breakdown</h2>
            {score && totalScore > 0 ? (
              <>
                <ScoreBar label="Semantic Match (35%)" value={semanticScore} />
                <ScoreBar label="Skill Match (30%)" value={skillScore} />
                <ScoreBar label="Experience (20%)" value={expScore} />
                <ScoreBar label="Education (10%)" value={eduScore} />
                <ScoreBar label="Seniority Fit (5%)" value={senScore} />
                {(score.scoreExplanation || score.score_explanation) && (
                  <div className="mt-4 bg-slate-800 rounded-lg p-3 text-xs text-slate-300 italic border-l-2 border-blue-500">
                    "{score.scoreExplanation || score.score_explanation}"
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">
                Score not available yet. Upload a resume to this job first.
              </div>
            )}
          </div>

          <div className="space-y-4">
            {strengths.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-emerald-400 mb-3 text-sm">✅ Strengths</h3>
                <ul className="space-y-1.5">
                  {strengths.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {concerns.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-amber-400 mb-3 text-sm">⚠️ Concerns</h3>
                <ul className="space-y-1.5">
                  {concerns.map((c: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-red-400 mb-3 text-sm">❌ Missing Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {gaps.map((g: string) => (
                    <span key={g} className="text-xs bg-red-950/40 text-red-300 border border-red-800/40 px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {strengths.length === 0 && concerns.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center py-10">
                <div className="text-slate-500 text-sm">AI analysis will appear here after scoring completes.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="font-bold text-white mb-3 text-sm">Add Note</h2>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
              placeholder="Add your thoughts about this candidate..." />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setNoteRating(r)}
                    className={`text-xl transition ${r <= noteRating ? 'text-amber-400' : 'text-slate-700 hover:text-slate-500'}`}>
                    ★
                  </button>
                ))}
              </div>
              <button onClick={addNote} disabled={!noteContent.trim() || saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
                {saving ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </div>
          {!candidate.notes?.length && (
            <div className="text-center py-10 text-slate-500 text-sm">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
              No notes yet. Add the first one above.
            </div>
          )}
          {candidate.notes?.map((note: any) => (
            <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-white text-sm">{note.authorName || note.author_name}</div>
                <div className="flex items-center gap-2">
                  {note.rating && <span className="text-amber-400 text-xs">{'★'.repeat(note.rating)}</span>}
                  <span className="text-xs text-slate-500">
                    {new Date(note.createdAt || note.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {!candidate.stageHistory?.length && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No stage history yet.</div>
          )}
          {candidate.stageHistory?.map((h: any, i: number) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="text-slate-500">→</div>
              <div className="flex-1 text-sm text-slate-300">
                Moved to <span className="text-white font-semibold">{h.toStageName || h.to_stage_name}</span>
                {(h.movedByName || h.moved_by_name) && (
                  <span className="text-slate-500"> by {h.movedByName || h.moved_by_name}</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(h.movedAt || h.moved_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}