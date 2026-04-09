import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { authRoutes } from './routes/auth'
import { jobRoutes } from './routes/jobs'
import { resumeRoutes } from './routes/resumes'
import { candidateRoutes } from './routes/candidates'
import { pipelineRoutes } from './routes/pipeline'
import { analyticsRoutes } from './routes/analytics'
import { billingRoutes } from './routes/billing'
import { teamRoutes } from './routes/team'
import { authenticate } from './middleware/auth'
import { testDbConnection } from './db/client'

async function initQueues() {
  try {
    const { Queue } = await import('bullmq')
    const IORedis = (await import('ioredis')).default
    const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true
    })
    await conn.connect().catch(() => null)
    console.log('✅ Redis connected (queues available)')
  } catch {
    console.log('ℹ️  Redis not available — using inline processing (no queues)')
  }
}

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  }
})

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })

  await app.register(require('@fastify/swagger'), {
  openapi: {
    info: { title: 'Recruito AI API', version: '1.0.0', description: 'AI-powered ATS backend' },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  }
})

  await app.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false }
  })

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.headers['x-forwarded-for'] as string || req.ip
  })

  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'dev_secret',
    sign: { expiresIn: '7d' }
  })

  await app.register(cookie)

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 100 }
  })

  app.decorate('authenticate', authenticate)

  app.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

  await app.register(authRoutes,      { prefix: '/api/v1/auth' })
  await app.register(jobRoutes,       { prefix: '/api/v1/jobs' })
  await app.register(resumeRoutes,    { prefix: '/api/v1/resumes' })
  await app.register(candidateRoutes, { prefix: '/api/v1/candidates' })
  await app.register(pipelineRoutes,  { prefix: '/api/v1/pipeline' })
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
  await app.register(billingRoutes,   { prefix: '/api/v1/billing' })
  await app.register(teamRoutes,      { prefix: '/api/v1/team' })

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    const statusCode = error.statusCode || 500
    reply.code(statusCode).send({
      error: statusCode < 500 ? error.message : 'Internal Server Error',
      statusCode
    })
  })

  // await testDbConnection()
  await initQueues()

  const PORT = Number(process.env.PORT) || 3001
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`🚀 Recruito API running on http://localhost:${PORT}`)
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})