import { FastifyPluginAsync } from 'fastify'
import { sql } from '../db/client'
import { authenticate } from '../middleware/auth'

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/overview', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId

    const [jobCount] = await sql`SELECT COUNT(*) as count FROM jobs WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL`
    const [candCount] = await sql`SELECT COUNT(*) as count FROM candidates WHERE company_id = ${companyId} AND deleted_at IS NULL`
    const [weekCount] = await sql`SELECT COUNT(*) as count FROM candidates WHERE company_id = ${companyId} AND deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'`
    const [scoreAvg] = await sql`SELECT AVG(total_score) as avg FROM candidate_scores WHERE company_id = ${companyId}`
    const [company] = await sql`SELECT resume_credits, plan FROM companies WHERE id = ${companyId}`
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
      avgAiScore: scoreAvg.avg ? Number(scoreAvg.avg).toFixed(1) : null,
      creditsRemaining: Number(company.resume_credits || company.resumeCredits || 0),
      plan: company.plan || 'free',
      totalHired: 0,
      recentActivity: activity
    })
  })

  fastify.get('/funnel', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    const q = req.query as any
    const days = Number(q.days) || 30

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
  })

  fastify.get('/score-distribution', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId
    const q = req.query as any

    const dist = await sql`
      SELECT
        (FLOOR(total_score / 10) * 10)::INT as bucket_min,
        (FLOOR(total_score / 10) * 10 + 10)::INT as bucket_max,
        COUNT(*) as count
      FROM candidate_scores
      WHERE company_id = ${companyId}
      ${q.jobId ? sql`AND job_id = ${q.jobId}` : sql``}
      GROUP BY bucket_min, bucket_max
      ORDER BY bucket_min
    `
    return reply.send(dist)
  })

  fastify.get('/time-to-hire', { preHandler: [authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId

    const tth = await sql`
      SELECT j.title, j.id as job_id,
        ROUND(AVG(EXTRACT(EPOCH FROM (csh.moved_at - c.created_at)) / 86400)::NUMERIC, 1) as avg_days,
        COUNT(c.id) as hires
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      JOIN candidate_stage_history csh ON csh.candidate_id = c.id
      JOIN hiring_stages hs ON hs.id = csh.to_stage_id AND hs.stage_type = 'hired'
      WHERE c.company_id = ${companyId}
      GROUP BY j.id, j.title
      ORDER BY avg_days ASC
    `
    return reply.send(tth)
  })
}