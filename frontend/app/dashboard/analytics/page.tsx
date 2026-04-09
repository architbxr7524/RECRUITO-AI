'use client'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, jobsApi } from '../../../lib/api'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, Cell, PieChart, Pie
} from 'recharts'

const COLORS = ['#6366f1', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [jobId, setJobId] = useState('')

  const { data: overview }  = useQuery({ queryKey: ['analytics','overview'], queryFn: () => analyticsApi.overview().then(r=>r.data) })
  const { data: funnel }    = useQuery({ queryKey: ['analytics','funnel',days], queryFn: () => analyticsApi.funnel(days).then(r=>r.data) })
  const { data: scoreDist } = useQuery({ queryKey: ['analytics','scores',jobId], queryFn: () => analyticsApi.scoreDistribution(jobId||undefined).then(r=>r.data) })
  const { data: tth }       = useQuery({ queryKey: ['analytics','tth'], queryFn: () => analyticsApi.timeToHire().then(r=>r.data) })
  const { data: jobs }      = useQuery({ queryKey: ['jobs-select'], queryFn: () => jobsApi.list({limit:50}).then(r=>r.data) })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Hiring funnel & performance metrics</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Jobs', value: overview?.activeJobs },
          { label: 'Total Candidates', value: overview?.totalCandidates },
          { label: 'Total Hired', value: overview?.totalHired },
          { label: 'Avg AI Score', value: overview?.avgAiScore ? `${Number(overview.avgAiScore).toFixed(1)}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">{value ?? '—'}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hiring Funnel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-bold text-white mb-4 text-sm">Hiring Funnel</h2>
          {funnel?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Score Distribution</h2>
            <select value={jobId} onChange={e => setJobId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none">
              <option value="">All jobs</option>
              {jobs?.jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          {scoreDist?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scoreDist} margin={{ top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucketMin" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v => `${v}-${v+10}`} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [v, 'Candidates']}
                  labelFormatter={v => `Score ${v}–${Number(v)+10}`}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No scored candidates yet</div>
          )}
        </div>
      </div>

      {/* Time to Hire */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-bold text-white mb-4 text-sm">Time to Hire (days)</h2>
        {tth?.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="title" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [`${v} days`, 'Avg time to hire']} />
              <Bar dataKey="avgDays" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
            No hires recorded yet. Move candidates to the Hired stage to see data.
          </div>
        )}
      </div>
    </div>
  )
}
