import { FastifyPluginAsync } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { sql } from '../db/client'
import { authenticate } from '../middleware/auth'

const moveSchema = z.object({
  candidateId: z.string().uuid(),
  toStageId: z.string().uuid(),
  reason: z.string().optional()
})

export const pipelineRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get('/:jobId', { preHandler: [authenticate] }, async (req, reply) => {
  const { jobId } = req.params as { jobId: string }
  const companyId = req.user.companyId

  try {
    const jobs = await sql`
      SELECT id, title FROM jobs
      WHERE id = ${jobId} AND company_id = ${companyId} AND deleted_at IS NULL
    `
    if (!jobs.length) return reply.code(404).send({ error: 'Job not found' })

    let stages = await sql`
      SELECT * FROM hiring_stages
      WHERE company_id = ${companyId} AND job_id = ${jobId}
      ORDER BY position ASC
    `

    if (!stages.length) {
      const defaults = [
        { name: 'Applied',   position: 1, color: '#6366f1', stage_type: 'applied',   slug: 'applied' },
        { name: 'Screening', position: 2, color: '#f59e0b', stage_type: 'screening', slug: 'screening' },
        { name: 'Interview', position: 3, color: '#3b82f6', stage_type: 'interview', slug: 'interview' },
        { name: 'Offer',     position: 4, color: '#8b5cf6', stage_type: 'offer',     slug: 'offer' },
        { name: 'Hired',     position: 5, color: '#10b981', stage_type: 'hired',     slug: 'hired' },
        { name: 'Rejected',  position: 6, color: '#ef4444', stage_type: 'rejected',  slug: 'rejected' },
      ]
      stages = []  // ✅ no re-declaration, just reassign
      for (const s of defaults) {
        const [inserted] = await sql`
          INSERT INTO hiring_stages (company_id, job_id, name, slug, position, color, stage_type)
          VALUES (${companyId}, ${jobId}, ${s.name}, ${s.slug}, ${s.position}, ${s.color}, ${s.stage_type})
          RETURNING *
        `
        stages.push(inserted)
      }
    }

    const candidates = await sql`
      SELECT id, name, email, phone, score, stage_id, status, notes, created_at
      FROM candidates
      WHERE job_id = ${jobId}
        AND company_id = ${companyId}
        AND deleted_at IS NULL
      ORDER BY score DESC NULLS LAST
    `

    const kanban = stages.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
      stageType: stage.stage_type,
      candidates: candidates.filter((c: any) => String(c.stage_id) === String(stage.id))
    }))

    const total = candidates.length
    const scored = candidates.filter((c: any) => Number(c.score) > 0)
    const avgScore = scored.length
      ? scored.reduce((sum: number, c: any) => sum + Number(c.score), 0) / scored.length
      : 0

    return reply.send({
      job: jobs[0],
      stages: kanban,
      stats: { total, avgScore: Math.round(avgScore * 10) / 10 }
    })
  } catch (err: any) {
    fastify.log.error(err)
    return reply.code(500).send({ error: err?.message || 'Failed to fetch pipeline' })
  }
})

  fastify.post('/move', { preHandler: [authenticate] }, async (req, reply) => {
    const body = moveSchema.parse(req.body)
    const companyId = req.user.companyId

    try {
      const candidates = await sql`
        SELECT id, job_id, stage_id FROM candidates
        WHERE id = ${body.candidateId} AND company_id = ${companyId}
      `
      if (!candidates.length) return reply.code(404).send({ error: 'Candidate not found' })
      const candidate = candidates[0]

      const stages = await sql`
        SELECT id, name, stage_type FROM hiring_stages
        WHERE id = ${body.toStageId} AND company_id = ${companyId}
      `
      if (!stages.length) return reply.code(404).send({ error: 'Stage not found' })
      const targetStage = stages[0]
      const stageType = targetStage.stage_type || targetStage.stageType

      await sql`
        UPDATE candidates SET
          stage_id = ${body.toStageId},
          status = ${stageType === 'hired' ? 'hired' : stageType === 'rejected' ? 'rejected' : 'active'},
          updated_at = NOW()
        WHERE id = ${body.candidateId}
      `

      await sql`
        INSERT INTO candidate_stage_history
          (id, candidate_id, job_id, company_id, from_stage_id, to_stage_id, moved_by)
        VALUES (
          ${uuidv4()}, ${body.candidateId},
          ${candidate.job_id},
          ${companyId},
          ${candidate.stage_id},
          ${body.toStageId}, ${req.user.sub}
        )
      `

      return reply.send({ success: true, newStage: targetStage })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: err?.message || 'Failed to move candidate' })
    }
  })

  fastify.get('/stages/list', { preHandler: [authenticate] }, async (req, reply) => {
    const stages = await sql`
      SELECT * FROM hiring_stages
      WHERE company_id = ${req.user.companyId}
      ORDER BY position ASC
    `
    return reply.send(stages)
  })
}