'use client'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../../lib/api'
import { useAuthStore } from '../../../stores/authStore'
import Link from 'next/link'
import { Zap, Users, CreditCard, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => import('../../../lib/api').then(m => m.api.get('/billing/usage').then(r => r.data))
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Settings</h1>

      {/* Company */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Company Name</span>
            <span className="text-sm font-semibold text-white">{user?.companyName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Plan</span>
            <span className="text-sm font-semibold text-white capitalize flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />{user?.plan}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400">Your Role</span>
            <span className="text-sm font-semibold text-white capitalize">{user?.role}</span>
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
            <span className="text-2xl font-black text-white">{usage?.resumeCredits ?? '—'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{
              width: `${Math.min(100, ((usage?.resumeCredits || 0) / (usage?.resumeCreditTotal || 25)) * 100)}%`
            }} />
          </div>
          <div className="text-xs text-slate-500">Credits reset monthly with your subscription.</div>
        </div>

        {user?.plan === 'free' && (
          <div className="mt-4 bg-blue-950/40 border border-blue-800/50 rounded-lg p-4">
            <div className="font-bold text-blue-300 text-sm mb-1">Upgrade to unlock more</div>
            <div className="text-xs text-slate-400 mb-3">250 credits/mo, 5 jobs, team collaboration, advanced analytics</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-center">
                <div className="font-black text-white">$149<span className="text-xs text-slate-400">/mo</span></div>
                <div className="text-xs text-slate-400">Starter</div>
              </div>
              <div className="flex-1 bg-blue-600 rounded-lg p-3 text-center">
                <div className="font-black text-white">$499<span className="text-xs text-blue-200">/mo</span></div>
                <div className="text-xs text-blue-200">Pro — Best value</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Stripe integration coming soon. Contact hello@recruito.ai</p>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <Shield size={14} /> Account
        </h2>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex justify-between py-2 border-b border-slate-800">
            <span>Email</span><span className="text-white">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>User ID</span>
            <span className="font-mono text-xs text-slate-500">{user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
