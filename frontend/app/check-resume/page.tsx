'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function CheckResumePage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) setFile(files[0]) },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  })

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:3001/api/v1/resumes/analyze', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#3fb950'
    if (score >= 50) return '#d29922'
    return '#f85149'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 65) return 'Good'
    if (score >= 50) return 'Average'
    return 'Needs Work'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060910',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#e6edf3'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(48,64,92,0.4)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #2f81f7, #a371f7)',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '14px'
          }}>R</div>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Recruito AI</span>
          <span style={{
            fontSize: '11px', background: 'rgba(47,129,247,0.15)',
            color: '#2f81f7', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(47,129,247,0.3)'
          }}>Resume Checker</span>
        </div>
        <a href="/login" style={{ fontSize: '13px', color: '#7d8590', textDecoration: 'none' }}>
          HR Login →
        </a>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 600,
            background: 'rgba(47,129,247,0.1)', color: '#2f81f7',
            border: '1px solid rgba(47,129,247,0.2)',
            padding: '4px 12px', borderRadius: '999px', marginBottom: '16px', letterSpacing: '0.05em'
          }}>FREE RESUME ANALYSIS</div>
          <h1 style={{
            fontSize: '36px', fontWeight: 800, margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #e6edf3, #7d8590)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Is your resume good enough?
          </h1>
          <p style={{ fontSize: '16px', color: '#7d8590', margin: 0, lineHeight: 1.6 }}>
            Upload your resume and get instant AI feedback — score, skills analysis, and what to improve.
          </p>
        </div>

        {/* Upload */}
        {!result && (
          <div>
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? '#2f81f7' : 'rgba(48,64,92,0.6)'}`,
              borderRadius: '12px', padding: '48px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              background: isDragActive ? 'rgba(47,129,247,0.05)' : 'rgba(13,17,23,0.6)',
              marginBottom: '20px'
            }}>
              <input {...getInputProps()} />
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
              {file ? (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#3fb950', marginBottom: '4px' }}>
                    ✓ {file.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#7d8590' }}>
                    {(file.size / 1024).toFixed(0)} KB — Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                    {isDragActive ? 'Drop it here' : 'Drop your resume here'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#7d8590' }}>
                    PDF, DOCX, or TXT — free, no signup needed
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                borderRadius: '8px', padding: '12px 16px', fontSize: '13px',
                color: '#f85149', marginBottom: '16px'
              }}>{error}</div>
            )}

            <button onClick={analyze} disabled={!file || loading}
              style={{
                width: '100%', padding: '14px',
                background: !file || loading ? 'rgba(47,129,247,0.3)' : 'linear-gradient(135deg, #2f81f7, #1f6feb)',
                border: 'none', borderRadius: '10px', color: 'white',
                fontSize: '15px', fontWeight: 700, cursor: !file || loading ? 'not-allowed' : 'pointer',
                boxShadow: !file || loading ? 'none' : '0 0 24px rgba(47,129,247,0.3)',
                transition: 'all 0.2s'
              }}>
              {loading ? '🤖 Analyzing your resume...' : '✨ Analyze My Resume — Free'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px' }}>
              {['🔒 100% Private', '⚡ Instant Results', '🎯 AI-Powered'].map(t => (
                <div key={t} style={{ fontSize: '12px', color: '#7d8590' }}>{t}</div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* Score */}
            <div style={{
              background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)',
              borderRadius: '16px', padding: '32px', marginBottom: '20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '13px', color: '#7d8590', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Your Resume Score
              </div>
              <div style={{
                fontSize: '72px', fontWeight: 900, lineHeight: 1,
                color: getScoreColor(result.score)
              }}>{result.score}</div>
              <div style={{ fontSize: '14px', color: '#7d8590', marginTop: '4px' }}>/100</div>
              <div style={{
                display: 'inline-block', marginTop: '12px',
                background: getScoreColor(result.score) + '22',
                color: getScoreColor(result.score),
                border: `1px solid ${getScoreColor(result.score)}44`,
                padding: '6px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 700
              }}>{getScoreLabel(result.score)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Skills Found */}
              <div style={{
                background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)',
                borderRadius: '12px', padding: '20px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#3fb950', marginBottom: '12px' }}>
                  ✅ Skills Detected ({result.skills?.length || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.skills?.slice(0, 12).map((s: string) => (
                    <span key={s} style={{
                      fontSize: '11px', background: 'rgba(63,185,80,0.1)',
                      color: '#3fb950', border: '1px solid rgba(63,185,80,0.2)',
                      padding: '3px 8px', borderRadius: '4px'
                    }}>{s}</span>
                  ))}
                  {result.skills?.length > 12 && (
                    <span style={{ fontSize: '11px', color: '#7d8590' }}>+{result.skills.length - 12} more</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div style={{
                background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)',
                borderRadius: '12px', padding: '20px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2f81f7', marginBottom: '12px' }}>
                  📊 Profile Summary
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Experience', value: `${result.yearsExperience || 0} years` },
                    { label: 'Level', value: result.seniority || 'Mid-level' },
                    { label: 'Education', value: result.educationLevel || 'Bachelor' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#7d8590' }}>{label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3', textTransform: 'capitalize' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Improvements */}
            {result.improvements?.length > 0 && (
              <div style={{
                background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)',
                borderRadius: '12px', padding: '20px', marginBottom: '20px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#d29922', marginBottom: '12px' }}>
                  💡 How to Improve Your Resume
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.improvements.map((tip: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#d29922', flexShrink: 0, marginTop: '1px' }}>→</span>
                      <span style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: 1.5 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div style={{
                background: 'rgba(47,129,247,0.05)', border: '1px solid rgba(47,129,247,0.2)',
                borderRadius: '12px', padding: '20px', marginBottom: '24px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2f81f7', marginBottom: '8px' }}>🤖 AI Summary</div>
                <p style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
              </div>
            )}

            <button onClick={() => { setResult(null); setFile(null) }}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(22,27,39,0.8)', border: '1px solid rgba(48,64,92,0.6)',
                borderRadius: '10px', color: '#e6edf3', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer'
              }}>
              ← Check Another Resume
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}