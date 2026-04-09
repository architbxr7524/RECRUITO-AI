import { FastifyPluginAsync } from 'fastify'
import { sql } from '../db/client'
import { authenticate, requireRole } from '../middleware/auth'

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/v1/billing/plans ────────────────────────
  fastify.get('/plans', async (_req, reply) => {
    return reply.send({
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interval: 'month',
          credits: 25,
          jobs: 1,
          seats: 1,
          features: ['25 resume credits/mo', '1 active job', 'Basic AI scoring']
        },
        {
          id: 'starter',
          name: 'Starter',
          price: 149,
          interval: 'month',
          credits: 250,
          jobs: 5,
          seats: 3,
          features: ['250 resume credits/mo', '5 active jobs', '3 seats', 'Full AI scoring', 'Bulk upload', 'Analytics']
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 499,
          interval: 'month',
          credits: 1000,
          jobs: 25,
          seats: 10,
          features: ['1000 resume credits/mo', '25 active jobs', '10 seats', 'Custom stages', 'API access', 'Priority support']
        }
      ]
    })
  })

  // ── GET /api/v1/billing/usage ────────────────────────
  fastify.get('/usage', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    const [company] = await sql`
      SELECT c.resume_credits, c.plan,
             s.resume_credits_total, s.resume_credits_used,
             s.current_period_end, s.status as subscription_status
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id
      WHERE c.id = ${req.user.companyId}
    `

    const recentUsage = await sql`
      SELECT event_type, COUNT(*) as count
      FROM usage_logs
      WHERE company_id = ${req.user.companyId}
        AND created_at > DATE_TRUNC('month', NOW())
      GROUP BY event_type
      ORDER BY count DESC
    `

    return reply.send({ ...company, recentUsage })
  })
}
