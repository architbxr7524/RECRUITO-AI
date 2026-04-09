import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'

declare global {
  namespace FastifyInstance {
    interface FastifyInstance {
      authenticate: any
    }
  }
}

export interface JWTPayload {
  sub: string
  companyId: string
  role: string
  iat: number
  exp: number
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

export async function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()

      if (!roles.includes(request.user.role)) {
        return reply.status(403).send({
          error: `Role '${request.user.role}' is not permitted. Required: ${roles.join(' or ')}`
        })
      }
    } catch (error) {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  }
}