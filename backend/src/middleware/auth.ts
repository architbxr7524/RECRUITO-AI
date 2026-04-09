import { FastifyRequest, FastifyReply } from 'fastify'
import { sql } from '../db/client'

export interface JWTPayload {
  sub: string       // userId
  companyId: string
  email: string
  role: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate
  }
  interface FastifyRequest {
    user: JWTPayload
  }
}

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = extractToken(req)
    if (!token) {
      return reply.code(401).send({ error: 'Authorization token required' })
    }

    const payload = req.server.jwt.verify<JWTPayload>(token)
    req.user = payload

    // Verify user still exists + not deleted
    const users = await sql`
      SELECT id, company_id, role, deleted_at
      FROM users
      WHERE id = ${payload.sub}
        AND company_id = ${payload.companyId}
    `
    if (!users.length || users[0].deletedAt) {
      return reply.code(401).send({ error: 'User not found or deactivated' })
    }

  } catch (err: any) {
    if (err.code === 'FAST_JWT_EXPIRED') {
      return reply.code(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return reply.code(401).send({ error: 'Invalid token' })
  }
}

function extractToken(req: FastifyRequest): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieToken = (req.cookies as any)?.access_token
  if (cookieToken) return cookieToken
  return null
}

// RBAC middleware factory
export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send({ error: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({
        error: `Role '${req.user.role}' is not permitted. Required: ${roles.join(' or ')}`
      })
    }
  }
}
