import { FastifyPluginAsync } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { sql, paginate } from '../db/client'
import { authenticate, requireRole } from '../middleware/auth'

const createJobSchema = z.object({
  title: z.string().min(1).max(255),
  department: z.string().optional(),
  location: z.string().optional(),
  remoteType: z.enum(['onsite', 'remote', 'hybrid']).default('onsite'),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).default('full-time'),
  experienceMin: z.number().int().min(0).max(30).default(0),
  experienceMax: z.number().int().min(0).max(30).default(10),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().default('USD'),
  description: z.string().min(1),
  requirements: z.string().optional(),
  benefits: z.string().optional()
})

export const jobRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/v1/jobs
  fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
    const q = req.query as any
    const { limit, offset } = paginate(q.page, q.limit)
    const companyId = req.user.companyId

    const jobs = await sql`
      SELECT j.*,
        u.full_name as created_by_name,
        COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) as candidate_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.created_by
      LEFT JOIN candidates c ON c.job_id = j.id
      WHERE j.company_id = ${companyId} AND j.deleted_at IS NULL
      ${q.status ? sql`AND j.status = ${q.status}` : sql``}
      GROUP BY j.id, u.full_name
      ORDER BY j.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM jobs WHERE company_id = ${companyId} AND deleted_at IS NULL
    `

    return reply.send({ jobs, total: Number(count), page: q.page || 1, limit })
  })

     // POST /api/v1/jobs
fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
  try {
    const body = createJobSchema.parse(req.body)
    const jobId = uuidv4()
    const companyId = req.user.companyId
    const createdBy = req.user.sub

    const [job] = await sql`
      INSERT INTO jobs (
        id, company_id, created_by, title, department, location,
        remote_type, employment_type, experience_min, experience_max,
        salary_min, salary_max, salary_currency,
        description, requirements, benefits,
        status, embedding_status
      ) VALUES (
        ${jobId}, ${companyId}, ${createdBy},
        ${body.title}, ${body.department || null}, ${body.location || null},
        ${body.remoteType}, ${body.employmentType},
        ${body.experienceMin}, ${body.experienceMax},
        ${body.salaryMin || null}, ${body.salaryMax || null}, ${body.salaryCurrency},
        ${body.description}, ${body.requirements || null}, ${body.benefits || null},
        'draft', 'pending'
      )
      RETURNING *
    `

    await sql`
      INSERT INTO usage_logs (company_id, user_id, event_type, resource_type, resource_id)
      VALUES (${companyId}, ${createdBy}, 'job.created', 'job', ${jobId})
    `

    return reply.code(201).send(job)  // ✅ job is the row, not job[0]
  } catch (err: any) {
    console.error("JOB CREATE ERROR:", err)
    return reply.code(500).send({ error: err?.message || "Something went wrong" })
  }
})
  
    // PUBLIC route — no auth needed — add BEFORE /:jobId
    fastify.get('/public/:jobId', async (req, reply) => {
      const { jobId } = req.params as { jobId: string }
      try {
        const jobs = await sql`
          SELECT id, title, description, requirements, benefits,
                location, remote_type, employment_type,
                experience_min, experience_max, status, company_id
          FROM jobs
          WHERE id = ${jobId} AND status = 'active' AND deleted_at IS NULL
        `
        if (!jobs.length) return reply.code(404).send({ error: 'Job not found or not active' })
        return reply.send(jobs[0])
      } catch (err: any) {
        return reply.code(500).send({ error: err.message })
      }
  })

  // GET /api/v1/jobs/:jobId
fastify.get('/:jobId', { preHandler: [authenticate] }, async (req, reply) => {
  const { jobId } = req.params as { jobId: string }
  const companyId = req.user.companyId

  try {
    const jobs = await sql`
      SELECT j.*,
        u.full_name as created_by_name,
        COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) as candidate_count,
        AVG(cs.score) as avg_score
      FROM jobs j
      LEFT JOIN users u ON u.id = j.created_by
      LEFT JOIN candidates c ON c.job_id = j.id
      LEFT JOIN candidate_scores cs ON cs.job_id = j.id
      WHERE j.id = ${jobId} AND j.company_id = ${companyId} AND j.deleted_at IS NULL
      GROUP BY j.id, u.full_name
    `
    if (!jobs.length) return reply.code(404).send({ error: 'Job not found' })

    const job = jobs[0]
    return reply.send({
      ...job,
      candidateCount: Number(job.candidateCount || job.candidate_count || 0),
      avgScore: job.avgScore || job.avg_score || null
    })
  } catch (err: any) {
    fastify.log.error(err)
    return reply.code(500).send({ error: err?.message || 'Failed to fetch job' })
  }
})

  // PATCH /api/v1/jobs/:jobId
  fastify.patch('/:jobId', { preHandler: [authenticate] }, async (req, reply) => {
    const { jobId } = req.params as { jobId: string }
    const companyId = req.user.companyId
    const body = createJobSchema.partial().parse(req.body)

    const updates: Record<string, any> = {}
    if (body.title !== undefined)          updates.title = body.title
    if (body.department !== undefined)     updates.department = body.department
    if (body.location !== undefined)       updates.location = body.location
    if (body.remoteType !== undefined)     updates.remote_type = body.remoteType
    if (body.description !== undefined)   updates.description = body.description
    if (body.requirements !== undefined)  updates.requirements = body.requirements
    if (body.experienceMin !== undefined) updates.experience_min = body.experienceMin
    if (body.experienceMax !== undefined) updates.experience_max = body.experienceMax
    if (body.salaryMin !== undefined)     updates.salary_min = body.salaryMin
    if (body.salaryMax !== undefined)     updates.salary_max = body.salaryMax

    if (!Object.keys(updates).length) return reply.code(400).send({ error: 'No fields to update' })

    const [job] = await sql`
      UPDATE jobs SET ${sql(updates)}, updated_at = NOW()
      WHERE id = ${jobId} AND company_id = ${companyId} AND deleted_at IS NULL
      RETURNING *
    `
    if (!job) return reply.code(404).send({ error: 'Job not found' })
    return reply.send(job)
  })

  // POST /api/v1/jobs/:jobId/publish
fastify.post('/:jobId/publish', { preHandler: [authenticate] }, async (req, reply) => {
  const { jobId } = req.params as { jobId: string }
  const companyId = req.user.companyId

  try {
    const [job] = await sql`
      UPDATE jobs SET status = 'active', updated_at = NOW()
      WHERE id = ${jobId} AND company_id = ${companyId} AND deleted_at IS NULL
      RETURNING *
    `
    if (!job) return reply.code(404).send({ error: 'Job not found' })
    return reply.send(job)
  } catch (err: any) {
    fastify.log.error(err)
    return reply.code(500).send({ error: err?.message || 'Failed to publish job' })
  }
})

  // DELETE /api/v1/jobs/:jobId
  fastify.delete('/:jobId', { preHandler: [authenticate] }, async (req, reply) => {
    const { jobId } = req.params as { jobId: string }
    await sql`UPDATE jobs SET deleted_at = NOW() WHERE id = ${jobId} AND company_id = ${req.user.companyId}`
    return reply.code(204).send()
  })
}
