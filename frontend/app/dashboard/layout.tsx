'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/dashboard/jobs', label: 'Jobs', icon: '◈' },
  { href: '/dashboard/candidates', label: 'Candidates', icon: '◉' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: '⬡' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '▲' },
  { href: '/dashboard/settings', label: 'Settings', icon: '◎' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>({ fullName: 'Loading', companyName: '', plan: 'pro', role: 'owner' })

  useEffect(() => {
    const stored = localStorage.getItem('recruito-auth')
    if (!stored) { window.location.href = '/login'; return }
    try {
      const { state } = JSON.parse(stored)
      if (!state?.accessToken) { window.location.href = '/login'; return }
      setUser(state.user)
    } catch { window.location.href = '/login' }
  }, [])

  const initials = user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AJ'

  const logout = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', }}>
      {/* Sidebar */}
     <aside style={{
      width: '220px',
      flexShrink: 0,
      display: window.innerWidth < 768 ? 'none' : 'flex',
        background: 'var(--surface)',
        }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #2f81f7, #a371f7)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 900, color: 'white',
              boxShadow: '0 0 12px rgba(47,129,247,0.3)'
            }}>R</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>RECRUITO AI</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{user?.companyName || 'Workspace'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <a key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '6px',
                textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                transition: 'all 0.15s ease',
                background: active ? 'var(--accent-glow)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted)',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
                onMouseOver={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}>
                <span style={{ fontSize: '16px', opacity: active ? 1 : 0.6 }}>{icon}</span>
                {label}
              </a>
            )
          })}
        </nav>

        {/* Plan */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(47,129,247,0.1), rgba(163,113,247,0.1))',
            border: '1px solid rgba(47,129,247,0.2)',
            borderRadius: '8px', padding: '10px 12px',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Current Plan</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'capitalize' }}>{user?.plan || 'Pro'} Plan</div>
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #2f81f7, #a371f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'white'
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button onClick={logout} title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', borderRadius: '4px', fontSize: '14px' }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          {children}
        </div>
      </main>
    </div>
  )
}