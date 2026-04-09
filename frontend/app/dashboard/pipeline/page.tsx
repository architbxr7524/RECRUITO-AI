'use client'
import { useQuery } from '@tanstack/react-query'
import { jobsApi } from '../../../lib/api'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function PipelineIndexPage() {
  const { data } = useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: () => jobsApi.list({ status: 'active' }).then(r => r.data)
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-2">Pipeline</h1>
      <p className="text-slate-400 text-sm mb-6">Select a job to view its hiring pipeline.</p>
      <div className="space-y-3">
        {data?.jobs?.map((job: any) => (
          <Link key={job.id} href={`/dashboard/pipeline/${job.id}`}
            className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-5 py-4 transition group">
            <div>
              <div className="font-bold text-white group-hover:text-blue-400 transition">{job.title}</div>
              <div className="text-sm text-slate-400">{Number(job.candidateCount || job.candidate_count || 0)} candidates</div>
            </div>
            <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 transition" />
          </Link>
        ))}
        {!data?.jobs?.length && (
          <div className="text-center py-12 text-slate-500">
            <span className="text-4xl mx-auto mb-3 block text-center">📋</span>
            <p>No active jobs. <Link href="/dashboard/jobs/new" className="text-blue-400">Create one →</Link></p>
          </div>
        )}
      </div>
    </div>
  )
}
