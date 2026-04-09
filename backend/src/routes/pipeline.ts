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

    const jobs = await sql`
      SELECT id, title FROM jobs
      WHERE id = ${jobId} AND company_id = ${companyId} AND deleted_at IS NULL
    `
    if (!jobs.length) return reply.code(404).send({ error: 'Job not found' })

    const stages = await sql`
      SELECT * FROM hiring_stages
      WHERE company_id = ${companyId}
      ORDER BY position ASC
    `

    const candidates = await sql`
      SELECT
        c.id, c.full_name, c.current_title, c.years_experience,
        c.skills, c.ai_summary, c.current_stage_id, c.status,
        c.source, c.created_at, c.email,
        cs.total_score, cs.recommendation, cs.skill_gaps,
        r.parse_status, r.original_filename
      FROM candidates c
      LEFT JOIN candidate_scores cs ON cs.candidate_id = c.id AND cs.job_id = c.job_id
      LEFT JOIN resumes r ON r.candidate_id = c.id
      WHERE c.job_id = ${jobId}
        AND c.company_id = ${companyId}
        AND c.deleted_at IS NULL
      ORDER BY cs.total_score DESC NULLS LAST
    `
    console.log('DEBUG candidates[0]:', JSON.stringify(candidates[0]))
    console.log('DEBUG stages[0].id:', stages[0]?.id)

    const kanban = stages.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    position: stage.position,
    stageType: stage.stage_type || stage.stageType,
   
    candidates: candidates.filter((c: any) => {
  const cStage = String(c.currentStageId || c.current_stage_id || '')
  const sId = String(stage.id || '')
  if (stage.name === 'Applied') console.log('COMPARE:', cStage, '===', sId, ':', cStage === sId)
  return cStage === sId
})

}))

    const total = candidates.length
    const scored = candidates.filter((c: any) => Number(c.totalScore || c.total_score || 0) > 0)
    const avgScore = scored.length
      ? scored.reduce((sum: number, c: any) => sum + Number(c.totalScore || c.total_score || 0), 0) / scored.length
      : 0

    return reply.send({
      job: jobs[0],
      stages: kanban,
      stats: {
        total,
        avgScore: Math.round(avgScore * 10) / 10,
        parseComplete: candidates.filter((c: any) => c.parseStatus === 'success' || c.parse_status === 'success').length
      }
    })
  })

  fastify.post('/move', { preHandler: [authenticate] }, async (req, reply) => {
    const body = moveSchema.parse(req.body)
    const companyId = req.user.companyId

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
    const stageType = targetStage.stageType || targetStage.stage_type

    await sql`
      UPDATE candidates SET
        current_stage_id = ${body.toStageId},
        status = ${stageType === 'hired' ? 'hired' : stageType === 'rejected' ? 'rejected' : 'active'},
        updated_at = NOW()
      WHERE id = ${body.candidateId}
    `

    await sql`
      INSERT INTO candidate_stage_history
        (id, candidate_id, job_id, company_id, from_stage_id, to_stage_id, moved_by)
      VALUES (
        ${uuidv4()}, ${body.candidateId},
        ${candidate.jobId || candidate.job_id},
        ${companyId},
        ${candidate.currentStageId || candidate.current_stage_id},
        ${body.toStageId}, ${req.user.sub}
      )
    `

    return reply.send({ success: true, newStage: targetStage })
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