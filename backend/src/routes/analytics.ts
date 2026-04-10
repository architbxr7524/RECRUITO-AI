import { FastifyPluginAsync } from 'fastify'
import { sql } from '../db/client'
import { authenticate } from '../middleware/auth'

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/overview', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    try {
      const [jobCount] = await sql`SELECT COUNT(*) as count FROM jobs WHERE company_id = ${companyId} AND deleted_at IS NULL`
      const [candCount] = await sql`SELECT COUNT(*) as count FROM candidates WHERE company_id = ${companyId} AND deleted_at IS NULL`
      const [weekCount] = await sql`SELECT COUNT(*) as count FROM candidates WHERE company_id = ${companyId} AND deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'`
      const [scoreAvg] = await sql`
        SELECT AVG(cs.total_score) as avg 
        FROM candidate_scores cs
        JOIN candidates c ON c.id = cs.candidate_id
        WHERE c.company_id = ${companyId} AND c.deleted_at IS NULL
      `
      const [company] = await sql`SELECT resume_credits, plan FROM companies WHERE id = ${companyId}`
      const [hiredCount] = await sql`SELECT COUNT(*) as count FROM candidates WHERE company_id = ${companyId} AND status = 'hired' AND deleted_at IS NULL`
      const activity = await sql`
        SELECT ul.event_type, ul.created_at, u.full_name as user_name
        FROM usage_logs ul
        LEFT JOIN users u ON u.id = ul.user_id
        WHERE ul.company_id = ${companyId}
        ORDER BY ul.created_at DESC
        LIMIT 10
      `
      return reply.send({
        activeJobs: Number(jobCount.count),
        totalCandidates: Number(candCount.count),
        newThisWeek: Number(weekCount.count),
        avgAiScore: scoreAvg?.avg ? Number(scoreAvg.avg).toFixed(1) : null,
        creditsRemaining: Number(company?.resume_credits ?? 0),
        plan: company?.plan ?? 'free',
        totalHired: Number(hiredCount.count),
        recentActivity: activity
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch overview' })
    }
  })

  fastify.get('/funnel', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    try {
      const funnel = await sql`
        SELECT hs.name, hs.position, hs.color, hs.stage_type,
          COUNT(DISTINCT c.id) as count
        FROM hiring_stages hs
        LEFT JOIN candidates c ON c.current_stage_id = hs.id
          AND c.company_id = ${companyId}
          AND c.deleted_at IS NULL
        WHERE hs.company_id = ${companyId}
        GROUP BY hs.id, hs.name, hs.position, hs.color, hs.stage_type
        ORDER BY hs.position
      `
      return reply.send(funnel)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch funnel' })
    }
  })

  fastify.get('/score-distribution', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    const q = req.query as any
    try {
      const dist = await sql`
        SELECT
          (FLOOR(cs.total_score / 10) * 10)::INT as bucket_min,
          (FLOOR(cs.total_score / 10) * 10 + 10)::INT as bucket_max,
          COUNT(*) as count
        FROM candidate_scores cs
        JOIN candidates c ON c.id = cs.candidate_id
        WHERE c.company_id = ${companyId}
          AND cs.total_score IS NOT NULL
          AND c.deleted_at IS NULL
          ${q.jobId ? sql`AND c.job_id = ${q.jobId}` : sql``}
        GROUP BY bucket_min, bucket_max
        ORDER BY bucket_min
      `
      return reply.send(dist)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch score distribution' })
    }
  })

  fastify.get('/time-to-hire', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    try {
      const tth = await sql`
        SELECT
          j.title,
          j.id as job_id,
          COUNT(c.id) as total_candidates,
          ROUND(
            AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 86400)::NUMERIC, 1
          ) as avg_days
        FROM jobs j
        LEFT JOIN candidates c ON c.job_id = j.id AND c.deleted_at IS NULL
        WHERE j.company_id = ${companyId}
        GROUP BY j.id, j.title
        ORDER BY j.created_at DESC
        LIMIT 10
      `
      return reply.send(tth)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch time-to-hire' })
    }
  })
}