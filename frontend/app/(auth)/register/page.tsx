'use client'
import { useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1` })

export default function RegisterPage() {
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', form)
      const { user, accessToken, refreshToken } = res.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('recruito-auth', JSON.stringify({ state: { user, accessToken }, version: 0 }))
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Acme Corp' },
    { key: 'fullName', label: 'Your Full Name', type: 'text', placeholder: 'John Smith' },
    { key: 'email', label: 'Work Email', type: 'email', placeholder: 'john@company.com' },
    { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#060910',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(47,129,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, #2f81f7 0%, #a371f7 100%)',
            borderRadius: '12px', marginBottom: '16px',
            boxShadow: '0 0 30px rgba(47,129,247,0.3)',
            fontSize: '20px', fontWeight: 900, color: 'white'
          }}>R</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e6edf3', margin: '0 0 6px 0' }}>Create your account</h1>
          <p style={{ fontSize: '14px', color: '#7d8590', margin: 0 }}>Start with 25 free AI credits</p>
        </div>

        <div style={{
          background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(48,64,92,0.6)',
          borderRadius: '16px', padding: '32px',
          backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <form onSubmit={handleSubmit}>
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c9d1d9', marginBottom: '6px' }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(22,27,39,0.8)',
                    border: '1px solid rgba(48,64,92,0.8)',
                    borderRadius: '8px', color: '#e6edf3',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2f81f7')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(48,64,92,0.8)')}
                />
              </div>
            ))}

            {error && (
              <div style={{
                background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#f85149', marginBottom: '16px'
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? 'rgba(47,129,247,0.5)' : 'linear-gradient(135deg, #2f81f7, #1f6feb)',
                border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 0 20px rgba(47,129,247,0.3)'
              }}>
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#7d8590' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#2f81f7', textDecoration: 'none', fontWeight: 500 }}>Sign in →</a>
        </p>
      </div>
      <style>{`* { box-sizing: border-box; } input::placeholder { color: #4a5568; }`}</style>
    </div>
  )
}