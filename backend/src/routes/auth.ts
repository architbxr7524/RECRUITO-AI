import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { sql } from '../db/client'
import { authenticate } from '../middleware/auth'

const registerSchema = z.object({
  companyName: z.string().min(1).default("MyCompany"),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(255)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.post('/register', async (req, reply) => {
  try {
    const body = registerSchema.parse(req.body)
    const existing = await sql`SELECT id FROM users WHERE email = ${body.email}`
    if (existing.length) return reply.code(409).send({ error: 'Email already registered' })

    const slug = body.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 80) + '-' + Date.now().toString(36)
    const passwordHash = await bcrypt.hash(body.password, 10)
    const companyId = uuidv4()
    const userId = uuidv4()

    await sql`INSERT INTO companies (id, name, slug, plan, resume_credits) VALUES (${companyId}, ${body.companyName}, ${slug}, 'free', 25)`
    await sql`INSERT INTO users (id, company_id, email, password_hash, full_name, role, email_verified) VALUES (${userId}, ${companyId}, ${body.email}, ${passwordHash}, ${body.fullName}, 'owner', true)`
    await sql`INSERT INTO hiring_stages (company_id, name, slug, color, position, stage_type) VALUES
      (${companyId}, 'Applied', 'applied', '#64748b', 1, 'inbox'),
      (${companyId}, 'Phone Screen', 'phone_screen', '#3b82f6', 2, 'screening'),
      (${companyId}, 'Technical', 'technical', '#8b5cf6', 3, 'interview'),
      (${companyId}, 'Final Round', 'final_round', '#f59e0b', 4, 'interview'),
      (${companyId}, 'Offer', 'offer', '#10b981', 5, 'offer'),
      (${companyId}, 'Hired', 'hired', '#22c55e', 6, 'hired'),
      (${companyId}, 'Rejected', 'rejected', '#ef4444', 7, 'rejected')`
    await sql`INSERT INTO subscriptions (company_id, plan, status, resume_credits_total, seats_included) VALUES (${companyId}, 'free', 'active', 25, 1)`

    const user = { id: userId, email: body.email, fullName: body.fullName, role: 'owner', companyId }
    const tokens = issueTokens(fastify, user)
    return reply.code(201).send({ user, ...tokens })
  } catch (err: any) {
    console.error('Registration error:', err)
    return reply.code(500).send({ error: err.message || 'Registration failed' })
  }
})

  fastify.post('/login', async (req, reply) => {
  try {
    const body = loginSchema.parse(req.body)

    const result = await sql`
      SELECT u.id, u.email, u.full_name, u.role, u.password_hash, u.company_id,
             c.name as company_name, c.slug as company_slug, c.plan, c.resume_credits
      FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.email = ${body.email}
    `

    if (!result.length) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const user = result[0]

    const valid = await bcrypt.compare(body.password, user.password_hash)

    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const tokens = issueTokens(fastify, {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    })

    return reply.send({ user, ...tokens })

  } catch (err: any) {
    return reply.code(500).send({ error: err.message })
  }
})
  fastify.post('/refresh', async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string }
    if (!refreshToken) return reply.code(401).send({ error: 'Refresh token required' })
    try {
      const payload = fastify.jwt.verify<any>(refreshToken)
      const users = await sql`SELECT * FROM users WHERE id = ${payload.sub} AND deleted_at IS NULL`
      if (!users.length) return reply.code(401).send({ error: 'User not found' })
      return reply.send(issueTokens(fastify, users[0]))
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const users = await sql`
      SELECT u.id, u.email, u.full_name, u.role, u.avatar_url,
             c.id as company_id, c.name as company_name, c.slug, c.plan, c.resume_credits
      FROM users u JOIN companies c ON c.id = u.company_id
      WHERE u.id = ${req.user.sub}
    `
    if (!users.length) return reply.code(404).send({ error: 'User not found' })
    const u = users[0]
    return reply.send({
      id: u.id, email: u.email,
      fullName: u.full_name || u.fullName,
      role: u.role,
      companyId: u.company_id || u.companyId,
      companyName: u.company_name || u.companyName,
      plan: u.plan,
      resumeCredits: u.resume_credits || u.resumeCredits
    })
  })
}

function issueTokens(fastify: any, user: any) {
  const companyId = user.companyId || user.company_id
  const accessToken = fastify.jwt.sign({ sub: user.id, companyId, email: user.email, role: user.role })
  const refreshToken = fastify.jwt.sign({ sub: user.id }, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}
