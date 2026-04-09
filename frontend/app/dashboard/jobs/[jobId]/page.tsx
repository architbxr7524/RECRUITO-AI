'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi, resumesApi } from '../../../../lib/api'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Users, Zap, CheckCircle } from 'lucide-react'

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId).then(r => r.data)
  })

  const publishMutation = useMutation({
    mutationFn: () => jobsApi.publish(jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job', jobId] }); toast.success('Job published!') }
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!job) return
    setUploading(true)
    const results: string[] = []

    for (const file of acceptedFiles) {
      try {
        if (file.name.endsWith('.zip')) {
          await resumesApi.uploadZip(file, jobId)
          results.push(`📦 ${file.name} (ZIP — multiple resumes queued)`)
        } else {
          await resumesApi.upload(file, jobId)
          results.push(`✅ ${file.name}`)
        }
      } catch (err: any) {
        results.push(`❌ ${file.name}: ${err.response?.data?.error || 'Upload failed'}`)
      }
    }

    setUploadedFiles(prev => [...prev, ...results])
    setUploading(false)
    qc.invalidateQueries({ queryKey: ['job', jobId] })
    toast.success(`${acceptedFiles.length} file(s) uploaded — AI parsing started`)
  }, [job, jobId, qc])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 100
  })

  if (isLoading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-4 bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  )

  if (!job) return <div className="p-6 text-slate-400">Job not found</div>

  const parsedSkills = (() => {
    try {
      if (!job.parsedSkills) return []
      if (Array.isArray(job.parsedSkills)) return job.parsedSkills
      return JSON.parse(job.parsedSkills)
    } catch { return [] }
  })()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/dashboard/jobs" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition w-fit">
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400">
            <span>{job.department}</span>
            {job.department && <span>·</span>}
            <span>{job.location}</span>
            {job.location && <span>·</span>}
            <span className="capitalize">{job.remoteType}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/pipeline/${jobId}`}
            className="flex items-center gap-1.5 text-sm border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition">
            📋 Pipeline
          </Link>
          {job.status === 'draft' && (
            <button onClick={() => publishMutation.mutate()}
              className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition font-semibold">
              <Zap size={14} /> Publish Job
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Candidates', value: job.candidateCount || 0, icon: Users },
          { label: 'Avg AI Score', value: job.avgScore ? `${Number(job.avgScore).toFixed(1)}/100` : '—', icon: Zap },
          { label: 'Status', value: job.status, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <Icon size={18} className="text-blue-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-white capitalize">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resume Upload */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="font-bold text-white mb-1">Upload Resumes</h2>
        <p className="text-xs text-slate-500 mb-4">
          Drop PDF, DOCX, or TXT files. Or drop a ZIP to upload many at once. AI scores each candidate automatically in ~5 seconds.
        </p>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            isDragActive ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className={`mx-auto mb-3 ${isDragActive ? 'text-blue-400' : 'text-slate-500'}`} />
          {uploading ? (
            <div>
              <p className="text-white font-semibold text-sm">Uploading...</p>
              <p className="text-slate-400 text-xs mt-1">Sending to AI pipeline...</p>
            </div>
          ) : isDragActive ? (
            <p className="text-blue-400 font-semibold text-sm">Drop files here</p>
          ) : (
            <>
              <p className="text-white font-semibold text-sm">Drag & drop resumes here</p>
              <p className="text-slate-400 text-xs mt-1">or click to browse — PDF, DOCX, TXT, ZIP</p>
            </>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs text-slate-500 mb-2">After upload, go to <Link href={`/dashboard/pipeline/${jobId}`} className="text-blue-400">Pipeline</Link> or <Link href="/dashboard/candidates" className="text-blue-400">Candidates</Link> to see results.</p>
            {uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded-lg px-3 py-2">
                <FileText size={12} className="text-slate-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="font-bold text-white mb-4">Job Description</h2>
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{job.description}</p>
        {job.requirements && (
          <>
            <h3 className="font-bold text-white mt-5 mb-2 text-sm">Requirements</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
          </>
        )}
        {parsedSkills.length > 0 && (
          <>
            <h3 className="font-bold text-white mt-5 mb-2 text-sm">AI-Extracted Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {parsedSkills.map((skill: string) => (
                <span key={skill} className="text-xs bg-blue-950/50 text-blue-300 border border-blue-800/50 px-2.5 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
