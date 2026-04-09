'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '../../../../lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Briefcase } from 'lucide-react'

const INPUT = "w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
const LABEL = "block text-sm font-medium text-slate-300 mb-1.5"
const SELECT = `${INPUT} cursor-pointer`

export default function NewJobPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', department: '', location: '', remoteType: 'hybrid',
    employmentType: 'full-time', experienceMin: 2, experienceMax: 6,
    salaryMin: '', salaryMax: '', salaryCurrency: 'USD',
    description: '', requirements: '', benefits: ''
  })

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const createMutation = useMutation({
    mutationFn: (data: any) => jobsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job created!')
      router.push(`/dashboard/jobs/${res.data.id}`)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create job')
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      experienceMin: Number(form.experienceMin),
      experienceMax: Number(form.experienceMax),
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/jobs" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition w-fit">
          <ArrowLeft size={14} /> Back to Jobs
        </Link>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Briefcase size={22} className="text-blue-400" /> Create New Job
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Job Title *</label>
              <input className={INPUT} value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Senior Software Engineer" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Department</label>
                <input className={INPUT} value={form.department} onChange={e => set('department', e.target.value)}
                  placeholder="Engineering" />
              </div>
              <div>
                <label className={LABEL}>Location</label>
                <input className={INPUT} value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="San Francisco, CA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Remote Type</label>
                <select className={SELECT} value={form.remoteType} onChange={e => set('remoteType', e.target.value)}>
                  <option value="onsite">On-site</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Employment Type</label>
                <select className={SELECT} value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Experience & Salary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Experience & Compensation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Min Experience (years)</label>
              <input type="number" className={INPUT} min={0} max={30} value={form.experienceMin}
                onChange={e => set('experienceMin', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Max Experience (years)</label>
              <input type="number" className={INPUT} min={0} max={30} value={form.experienceMax}
                onChange={e => set('experienceMax', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Min Salary (optional)</label>
              <input type="number" className={INPUT} value={form.salaryMin}
                onChange={e => set('salaryMin', e.target.value)} placeholder="80000" />
            </div>
            <div>
              <label className={LABEL}>Max Salary (optional)</label>
              <input type="number" className={INPUT} value={form.salaryMax}
                onChange={e => set('salaryMax', e.target.value)} placeholder="140000" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Job Content</h2>
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Job Description *</label>
              <textarea className={`${INPUT} min-h-[140px] resize-y`} value={form.description}
                onChange={e => set('description', e.target.value)} required
                placeholder="Describe the role, responsibilities, and team..." />
              <p className="text-xs text-slate-500 mt-1">AI will extract required skills from this description automatically.</p>
            </div>
            <div>
              <label className={LABEL}>Requirements</label>
              <textarea className={`${INPUT} min-h-[100px] resize-y`} value={form.requirements}
                onChange={e => set('requirements', e.target.value)}
                placeholder="List required skills, qualifications, certifications..." />
            </div>
            <div>
              <label className={LABEL}>Benefits (optional)</label>
              <textarea className={`${INPUT} min-h-[80px] resize-y`} value={form.benefits}
                onChange={e => set('benefits', e.target.value)}
                placeholder="Health insurance, 401k, remote work, equity..." />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition">
            {createMutation.isPending ? 'Creating...' : 'Create Job (Save as Draft)'}
          </button>
          <Link href="/dashboard/jobs" className="text-sm text-slate-400 hover:text-white transition">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
