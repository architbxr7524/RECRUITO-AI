import { FastifyPluginAsync } from 'fastify'
import { sql } from '../db/client'
import { authenticate, requireRole } from '../middleware/auth'

export const teamRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/v1/team
  fastify.get('/', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    const members = await sql`
      SELECT id, email, full_name, role, avatar_url, last_login_at, created_at
      FROM users
      WHERE company_id = ${req.user.companyId} AND deleted_at IS NULL
      ORDER BY created_at ASC
    `
    return reply.send(members)
  })

  // PATCH /api/v1/team/:userId/role
  fastify.patch('/:userId/role', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { role } = req.body as { role: string }

    const validRoles = ['admin', 'recruiter', 'viewer']
    if (!validRoles.includes(role)) {
      return reply.code(400).send({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    const [user] = await sql`
      UPDATE users SET role = ${role}, updated_at = NOW()
      WHERE id = ${userId} AND company_id = ${req.user.companyId} AND deleted_at IS NULL
      RETURNING id, email, full_name, role
    `
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send(user)
  })

  // DELETE /api/v1/team/:userId
  fastify.delete('/:userId', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    const { userId } = req.params as { userId: string }

    if (userId === req.user.sub) {
      return reply.code(400).send({ error: 'Cannot remove yourself' })
    }

    await sql`
      UPDATE users SET deleted_at = NOW()
      WHERE id = ${userId} AND company_id = ${req.user.companyId}
    `
    return reply.code(204).send()
  })
}
