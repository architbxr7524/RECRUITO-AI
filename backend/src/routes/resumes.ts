import { FastifyPluginAsync } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import JSZip from 'jszip'
import { sql } from '../db/client'
import { authenticate } from '../middleware/auth'
import { processResume } from '../services/resume-processor'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt']
const BUCKET = process.env.S3_BUCKET || 'recruito-resumes'

async function createCandidateAndResume(tx: any, companyId: string, jobId: string, filename: string, mimeType: string, fileSize: number) {
  const stages = await tx`
  SELECT id FROM hiring_stages
  WHERE company_id = ${companyId} AND stage_type = 'inbox'
  ORDER BY position LIMIT 1
`

// Fallback: get ANY first stage if inbox not found
let stageId = stages[0]?.id || null
if (!stageId) {
  const fallback = await tx`
    SELECT id FROM hiring_stages
    WHERE company_id = ${companyId}
    ORDER BY position LIMIT 1
  `
  stageId = fallback[0]?.id || null
}

const candidateId = uuidv4()
const [candidate] = await tx`
  INSERT INTO candidates (id, company_id, job_id, current_stage_id, source, status)
  VALUES (${candidateId}, ${companyId}, ${jobId}, ${stageId}, 'upload', 'new')
  RETURNING *
`

 
  const resumeId = uuidv4()
  const s3Key = `local/${companyId}/${resumeId}/${filename}`
  const [resume] = await tx`
    INSERT INTO resumes (id, candidate_id, company_id, s3_key, s3_bucket, original_filename, file_size, mime_type, parse_status)
    VALUES (${resumeId}, ${candidateId}, ${companyId}, ${s3Key}, 'local', ${filename}, ${fileSize}, ${mimeType}, 'pending')
    RETURNING *
  `
  return { candidate, resume }
}

export const resumeRoutes: FastifyPluginAsync = async (fastify) => {

  // ── PUBLIC: Analyze resume without auth ──────────
  fastify.post('/analyze', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })
    const buffer = await data.toBuffer()
    if (buffer.length > 10 * 1024 * 1024) return reply.code(400).send({ error: 'File too large' })

    const { parseResume } = await import('../services/mock-parser')

    let rawText = ''
    if (data.mimetype === 'text/plain') {
      rawText = buffer.toString('utf-8')
    } else if (data.mimetype.includes('wordprocessingml')) {
      try {
        const zip = await JSZip.loadAsync(buffer)
        const docXml = zip.files['word/document.xml']
        if (docXml) rawText = (await docXml.async('text')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      } catch {}
    } else {
      rawText = buffer.toString('latin1').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
    }

    if (rawText.length < 50) return reply.code(400).send({ error: 'Could not extract text. Use text-based PDF.' })

    const parsed = parseResume(rawText)

    const improvements: string[] = []
    if (parsed.skills.length < 5) improvements.push('Add more technical skills — aim for at least 8-10')
    if (!parsed.contact.email) improvements.push('Add your email address clearly at the top')
    if (!parsed.contact.linkedin) improvements.push('Add your LinkedIn profile URL')
    if (!parsed.contact.github) improvements.push('Add GitHub profile to showcase your projects')
    if (parsed.yearsExperience < 2) improvements.push('Add more detailed work experience with achievements')
    if (!parsed.contact.location) improvements.push('Add your city or location')
    if (improvements.length === 0) improvements.push('Strong resume! Keep it updated with recent work.')

    let score = 50
    score += Math.min(parsed.skills.length * 2, 20)
    score += Math.min(parsed.yearsExperience * 3, 15)
    if (parsed.contact.email) score += 5
    if (parsed.contact.linkedin) score += 5
    if (parsed.contact.github) score += 3
    if (parsed.educationLevel === 'master' || parsed.educationLevel === 'phd') score += 5
    else if (parsed.educationLevel === 'bachelor') score += 3
    score = Math.min(score, 98)

    return reply.send({
      score: Math.round(score),
      skills: parsed.skills,
      yearsExperience: parsed.yearsExperience,
      seniority: parsed.seniority,
      educationLevel: parsed.educationLevel,
      summary: parsed.aiSummary,
      improvements,
      name: parsed.contact.fullName
    })
  })

     // PUBLIC resume upload — no auth needed
fastify.post('/upload/public', async (req, reply) => {
  try {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })
    
    const query = req.query as any
    const jobId = query.jobId
    if (!jobId) return reply.code(400).send({ error: 'jobId required' })

    // Get job to find company
    const jobs = await sql`
      SELECT id, company_id FROM jobs 
      WHERE id = ${jobId} AND status = 'active' AND deleted_at IS NULL
    `
    if (!jobs.length) return reply.code(404).send({ error: 'Job not found' })
    
    const job = jobs[0]
    const candidateId = uuidv4()
    const candidateName = query.candidateName || 'Unknown'
    const candidateEmail = query.candidateEmail || null

    // Save candidate record
    await sql`
      INSERT INTO candidates (id, company_id, job_id, full_name, email, source, status)
      VALUES (${candidateId}, ${job.company_id}, ${jobId}, ${candidateName}, ${candidateEmail}, 'applied', 'new')
      ON CONFLICT DO NOTHING
    `

    return reply.code(201).send({ success: true, candidateId })
  } catch (err: any) {
    console.error('Public upload error:', err)
    return reply.code(500).send({ error: err.message })
  }
})

  // ── Single upload ─────────────────────────────────
  fastify.post('/upload', { preHandler: [authenticate] }, async (req, reply) => {
    const { jobId } = req.query as { jobId: string }
    if (!jobId) return reply.code(400).send({ error: 'jobId is required' })

    const [company] = await sql`SELECT resume_credits FROM companies WHERE id = ${req.user.companyId}`
    if (!company || (company.resume_credits ?? company.resumeCredits ?? 0) < 1) {
      return reply.code(402).send({ error: 'Insufficient resume credits.' })
    }

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })
    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Invalid file type. Allowed: PDF, DOCX, TXT' })
    }

    const buffer = await data.toBuffer()
    if (buffer.length > 10 * 1024 * 1024) return reply.code(400).send({ error: 'File too large. Max 10MB' })

    const { candidate, resume } = await sql.begin(async tx => {
      const result = await createCandidateAndResume(tx, req.user.companyId, jobId, data.filename, data.mimetype, buffer.length)
      await tx`UPDATE companies SET resume_credits = resume_credits - 1 WHERE id = ${req.user.companyId}`
      return result
    })

    setImmediate(async () => {
      try {
        await processResume(resume.id, candidate.id, jobId, req.user.companyId, buffer, data.mimetype)
      } catch (e) {}
    })

    await sql`
      INSERT INTO usage_logs (company_id, user_id, event_type, resource_type, resource_id, credits_consumed)
      VALUES (${req.user.companyId}, ${req.user.sub}, 'resume.uploaded', 'resume', ${resume.id})
    `

    return reply.code(202).send({
      resumeId: resume.id,
      candidateId: candidate.id,
      status: 'processing',
      message: 'Resume uploaded — AI parsing in progress (~5 seconds)'
    })
  })

  // ── Bulk upload ───────────────────────────────────
  fastify.post('/bulk', { preHandler: [authenticate] }, async (req, reply) => {
    const { jobId } = req.query as { jobId: string }
    if (!jobId) return reply.code(400).send({ error: 'jobId is required' })

    const parts = req.files()
    const results: any[] = []
    const errors: any[] = []

    for await (const part of parts) {
      if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
        errors.push({ filename: part.filename, error: 'Invalid type' })
        continue
      }
      try {
        const buffer = await part.toBuffer()
        const { candidate, resume } = await sql.begin(async tx =>
          createCandidateAndResume(tx, req.user.companyId, jobId, part.filename, part.mimetype, buffer.length)
        )
        setImmediate(async () => {
          try { await processResume(resume.id, candidate.id, jobId, req.user.companyId, buffer, part.mimetype) } catch {}
        })
        results.push({ filename: part.filename, resumeId: resume.id, candidateId: candidate.id })
      } catch (err: any) {
        errors.push({ filename: part.filename, error: err.message })
      }
    }
    return reply.code(202).send({ queued: results.length, failed: errors.length, results, errors })
  })

  // ── ZIP upload ────────────────────────────────────
  fastify.post('/zip', { preHandler: [authenticate] }, async (req, reply) => {
    const { jobId } = req.query as { jobId: string }
    if (!jobId) return reply.code(400).send({ error: 'jobId is required' })

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No ZIP file' })

    const buffer = await data.toBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const resumeFiles = Object.entries(zip.files).filter(([name, file]) => {
      if (file.dir) return false
      const ext = name.toLowerCase().slice(name.lastIndexOf('.'))
      return ALLOWED_EXTENSIONS.includes(ext)
    }).slice(0, 100)

    const results: any[] = []
    const errors: any[] = []

    for (const [filename, zipFile] of resumeFiles) {
      try {
        const fileBuffer = Buffer.from(await zipFile.async('arraybuffer'))
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
        const mimeType = ext === '.pdf' ? 'application/pdf'
          : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain'
        const baseName = filename.split('/').pop() || filename

        const { candidate, resume } = await sql.begin(async tx =>
          createCandidateAndResume(tx, req.user.companyId, jobId, baseName, mimeType, fileBuffer.length)
        )
        setImmediate(async () => {
          try { await processResume(resume.id, candidate.id, jobId, req.user.companyId, fileBuffer, mimeType) } catch {}
        })
        results.push({ filename: baseName, resumeId: resume.id, candidateId: candidate.id })
      } catch (err: any) {
        errors.push({ filename, error: err.message })
      }
    }
    return reply.code(202).send({ queued: results.length, failed: errors.length, results, errors })
  })

  // ── Get file URL ──────────────────────────────────
  fastify.get('/:resumeId/file', { preHandler: [authenticate] }, async (req, reply) => {
    const { resumeId } = req.params as { resumeId: string }
    const resumes = await sql`
      SELECT s3_key, original_filename FROM resumes
      WHERE id = ${resumeId} AND company_id = ${req.user.companyId}
    `
    if (!resumes.length) return reply.code(404).send({ error: 'Resume not found' })
    return reply.send({ url: `/api/v1/resumes/${resumeId}/view`, filename: resumes[0].originalFilename })
  })
}


  