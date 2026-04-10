'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { CreditCard, Shield, Zap } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('recruito-auth') || '{}')?.state?.accessToken || '' } catch { return '' }
      })()
      return fetch('https://recruito-ai-production.up.railway.app/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
    }
  })

  const { data: usage } = useQuery({
    queryKey: ['billing-usage'],
    queryFn: () => {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('recruito-auth') || '{}')?.state?.accessToken || '' } catch { return '' }
      })()
      return fetch('https://recruito-ai-production.up.railway.app/api/v1/billing/usage', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
    }
  })

  const companyName = me?.companyName || user?.companyName || '—'
  const plan = me?.plan || user?.plan || 'free'
  const role = me?.role || user?.role || '—'
  const email = me?.email || user?.email || '—'
  const userId = me?.id || user?.id || '—'
  const credits = usage?.resume_credits ?? me?.resumeCredits ?? '—'
  const creditsTotal = usage?.resume_credits_total ?? 100

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Settings</h1>

      {/* Company */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Company Name</span>
            <span className="text-sm font-semibold text-white">{companyName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Plan</span>
            <span className="text-sm font-semibold text-white capitalize flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />{plan}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400">Your Role</span>
            <span className="text-sm font-semibold text-white capitalize">{role}</span>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={14} /> Billing & Credits
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Resume Credits Remaining</span>
            <span className="text-2xl font-black text-white">{credits}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{
              width: `${Math.min(100, (Number(credits) / creditsTotal) * 100)}%`
            }} />
          </div>
          <div className="text-xs text-slate-500">Credits reset monthly with your subscription.</div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <Shield size={14} /> Account
        </h2>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex justify-between py-2 border-b border-slate-800">
            <span>Email</span>
            <span className="text-white">{email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>User ID</span>
            <span className="font-mono text-xs text-slate-500">{userId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}