import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sql, paginate } from '../db/client'
import { authenticate } from '../middleware/auth'

const noteSchema = z.object({
  content: z.string().min(1),
  noteType: z.enum(['note', 'flag', 'rating', 'decision']).default('note'),
  rating: z.number().int().min(1).max(5).optional(),
  isPrivate: z.boolean().default(false)
})

export const candidateRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/v1/candidates
  fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
    const q = req.query as any
    const { limit, offset } = paginate(q.page, q.limit)

    const candidates = await sql`
      SELECT
        c.id, c.full_name, c.current_title, c.current_company,
        c.years_experience, c.skills, c.ai_summary, c.current_stage_id,
        c.status, c.source, c.email, c.created_at,
        c.job_id,
        hs.name as stage_name,
        hs.color as stage_color,
        j.title as job_title,
        cs.total_score,
        cs.skill_match_score,
        cs.recommendation,
        COUNT(rn.id) as note_count
      FROM candidates c
      LEFT JOIN hiring_stages hs ON hs.id = c.current_stage_id
      LEFT JOIN jobs j ON j.id = c.job_id
      LEFT JOIN candidate_scores cs ON cs.candidate_id = c.id AND cs.job_id = c.job_id
      LEFT JOIN recruiter_notes rn ON rn.candidate_id = c.id AND rn.deleted_at IS NULL
      WHERE c.company_id = ${req.user.companyId}
        AND c.deleted_at IS NULL
        ${q.jobId ? sql`AND c.job_id = ${q.jobId}` : sql``}
        ${q.search ? sql`AND (c.full_name ILIKE ${'%' + q.search + '%'} OR c.email ILIKE ${'%' + q.search + '%'})` : sql``}
      GROUP BY c.id, hs.name, hs.color, j.title, cs.total_score, cs.skill_match_score, cs.recommendation
      ORDER BY ${q.sort === 'score' ? sql`cs.total_score DESC NULLS LAST` : sql`c.created_at DESC`}
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM candidates
      WHERE company_id = ${req.user.companyId} AND deleted_at IS NULL
      ${q.jobId ? sql`AND job_id = ${q.jobId}` : sql``}
    `

    return reply.send({ candidates, total: Number(count) })
  })

  // GET /api/v1/candidates/:id
  fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const candidates = await sql`
      SELECT
        c.id, c.full_name, c.email, c.phone, c.location,
        c.linkedin_url, c.github_url, c.portfolio_url,
        c.years_experience, c.current_title, c.current_company,
        c.education_level, c.skills, c.ai_summary,
        c.current_stage_id, c.status, c.source, c.job_id, c.assigned_to,
        c.created_at, c.updated_at,
        hs.name as stage_name,
        hs.color as stage_color,
        j.title as job_title,
        j.parsed_skills as job_required_skills,
        u.full_name as assigned_to_name
      FROM candidates c
      LEFT JOIN hiring_stages hs ON hs.id = c.current_stage_id
      LEFT JOIN jobs j ON j.id = c.job_id
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = ${id}
        AND c.company_id = ${req.user.companyId}
        AND c.deleted_at IS NULL
    `

    if (!candidates.length) {
      return reply.code(404).send({ error: 'Candidate not found' })
    }

    const candidate = candidates[0]

    // Get score
    const scores = await sql`
      SELECT * FROM candidate_scores
      WHERE candidate_id = ${id}
      ORDER BY scored_at DESC LIMIT 1
    `

    // Get resume
    const resumes = await sql`
      SELECT id, original_filename, parse_status, parsed_data, parsed_at, created_at
      FROM resumes
      WHERE candidate_id = ${id}
      ORDER BY created_at DESC LIMIT 1
    `

    // Get notes
    const notes = await sql`
      SELECT rn.id, rn.content, rn.note_type, rn.rating, rn.is_private, rn.created_at,
             u.full_name as author_name
      FROM recruiter_notes rn
      JOIN users u ON u.id = rn.author_id
      WHERE rn.candidate_id = ${id}
        AND rn.deleted_at IS NULL
        AND (rn.is_private = false OR rn.author_id = ${req.user.sub})
      ORDER BY rn.created_at DESC
    `

    // Get stage history
    const history = await sql`
      SELECT csh.id, csh.moved_at, csh.reason,
        hs_from.name as from_stage_name,
        hs_to.name as to_stage_name,
        u.full_name as moved_by_name
      FROM candidate_stage_history csh
      LEFT JOIN hiring_stages hs_from ON hs_from.id = csh.from_stage_id
      LEFT JOIN hiring_stages hs_to ON hs_to.id = csh.to_stage_id
      LEFT JOIN users u ON u.id = csh.moved_by
      WHERE csh.candidate_id = ${id}
      ORDER BY csh.moved_at ASC
    `

    return reply.send({
      ...candidate,
      score: scores[0] || null,
      resume: resumes[0] || null,
      notes,
      stageHistory: history
    })
  })

  // POST /api/v1/candidates/:id/notes
  fastify.post('/:id/notes', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = noteSchema.parse(req.body)

    const [candidate] = await sql`
      SELECT id FROM candidates WHERE id = ${id} AND company_id = ${req.user.companyId}
    `
    if (!candidate) return reply.code(404).send({ error: 'Candidate not found' })

    const { v4: uuidv4 } = await import('uuid')
    const [note] = await sql`
      INSERT INTO recruiter_notes (id, candidate_id, company_id, author_id, content, note_type, rating, is_private)
      VALUES (${uuidv4()}, ${id}, ${req.user.companyId}, ${req.user.sub}, ${body.content}, ${body.noteType}, ${body.rating || null}, ${body.isPrivate})
      RETURNING *
    `
    return reply.code(201).send(note)
  })

  // PATCH /api/v1/candidates/:id
  fastify.patch('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const updates: Record<string, any> = {}

    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo
    if (body.status !== undefined) updates.status = body.status

    if (!Object.keys(updates).length) {
      return reply.code(400).send({ error: 'No valid fields' })
    }

    const [candidate] = await sql`
      UPDATE candidates SET ${sql(updates)}, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${req.user.companyId}
      RETURNING *
    `
    if (!candidate) return reply.code(404).send({ error: 'Candidate not found' })
    return reply.send(candidate)
  })
}
