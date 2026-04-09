'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:3001/api/v1' })

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', form)
      const { user, accessToken, refreshToken } = res.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      const auth = { state: { user, accessToken }, version: 0 }
      localStorage.setItem('recruito-auth', JSON.stringify(auth))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060910',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(47,129,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(163,113,247,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, #2f81f7 0%, #a371f7 100%)',
            borderRadius: '12px', marginBottom: '16px',
            boxShadow: '0 0 30px rgba(47,129,247,0.3)',
            fontSize: '20px', fontWeight: 900, color: 'white'
          }}>R</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e6edf3', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Recruito AI
          </h1>
          <p style={{ fontSize: '14px', color: '#7d8590', margin: 0 }}>
            AI-powered hiring platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,17,23,0.8)',
          border: '1px solid rgba(48,64,92,0.6)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e6edf3', margin: '0 0 24px 0' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c9d1d9', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'rgba(22,27,39,0.8)',
                  border: '1px solid rgba(48,64,92,0.8)',
                  borderRadius: '8px', color: '#e6edf3',
                  fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = '#2f81f7')}
                onBlur={e => (e.target.style.borderColor = 'rgba(48,64,92,0.8)')}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c9d1d9', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'rgba(22,27,39,0.8)',
                  border: '1px solid rgba(48,64,92,0.8)',
                  borderRadius: '8px', color: '#e6edf3',
                  fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = '#2f81f7')}
                onBlur={e => (e.target.style.borderColor = 'rgba(48,64,92,0.8)')}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#f85149', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? 'rgba(47,129,247,0.5)' : 'linear-gradient(135deg, #2f81f7, #1f6feb)',
                border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(47,129,247,0.3)'
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: '20px', paddingTop: '20px',
            borderTop: '1px solid rgba(48,64,92,0.4)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '6px' }}>Demo credentials</div>
            <code style={{ fontSize: '12px', color: '#c9d1d9', background: 'rgba(22,27,39,0.8)', padding: '4px 8px', borderRadius: '4px' }}>
              admin@acme.com / password123
            </code>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#7d8590' }}>
          No account?{' '}
          <a href="/register" style={{ color: '#2f81f7', textDecoration: 'none', fontWeight: 500 }}>
            Create one free →
          </a>
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #4a5568; }
      `}</style>
    </div>
  )
}