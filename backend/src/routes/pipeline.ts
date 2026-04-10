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

      // Stages are per COMPANY not per job
      const stages = await sql`
        SELECT * FROM hiring_stages
        WHERE company_id = ${companyId}
        ORDER BY position ASC
      `

      // Use correct column names: full_name, current_stage_id
      const candidates = await sql`
        SELECT 
          c.id, c.full_name, c.email, c.current_stage_id,
          c.current_title, c.skills, c.status, c.created_at,
          cs.total_score
        FROM candidates c
        LEFT JOIN candidate_scores cs ON cs.candidate_id = c.id AND cs.job_id = ${jobId}
        WHERE c.job_id = ${jobId}
          AND c.company_id = ${companyId}
          AND c.deleted_at IS NULL
        ORDER BY cs.total_score DESC NULLS LAST
      `

      const kanban = stages.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        stageType: stage.stage_type,
        candidates: candidates.filter((c: any) => 
          String(c.current_stage_id) === String(stage.id)
        )
      }))

      const total = candidates.length
      const scored = candidates.filter((c: any) => Number(c.total_score) > 0)
      const avgScore = scored.length
        ? scored.reduce((sum: number, c: any) => sum + Number(c.total_score), 0) / scored.length
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
        SELECT id, job_id, current_stage_id FROM candidates
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
      const stageType = targetStage.stage_type

      // Update using correct column name: current_stage_id
      await sql`
        UPDATE candidates SET
          current_stage_id = ${body.toStageId},
          status = ${stageType === 'hired' ? 'hired' : stageType === 'rejected' ? 'rejected' : 'active'},
          updated_at = NOW()
        WHERE id = ${body.candidateId}
      `

      // Insert stage history without job_id/company_id if they don't exist
      await sql`
        INSERT INTO candidate_stage_history
          (id, candidate_id, from_stage_id, to_stage_id, moved_by)
        VALUES (
          ${uuidv4()}, ${body.candidateId},
          ${candidate.current_stage_id},
          ${body.toStageId}, 
          ${req.user.sub}
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