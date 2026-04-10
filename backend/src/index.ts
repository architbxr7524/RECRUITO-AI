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

  // Drop old tables first
  try {
    const { sql } = await import('./db/client')
    await sql`DROP TABLE IF EXISTS users CASCADE`
    await sql`DROP TABLE IF EXISTS companies CASCADE`
    console.log('✅ Old tables dropped')
  } catch (err) {
    console.log('ℹ️ No old tables to drop')
  }

// Auto-create tables
  try {
    const { sql } = await import('./db/client')
    await sql`CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      plan VARCHAR(50) DEFAULT 'free',
      resume_credits INTEGER DEFAULT 25,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
    
    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      email VARCHAR(255) UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      password_hash TEXT,
      role VARCHAR(50) DEFAULT 'recruiter',
      full_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
    
    await sql`CREATE TABLE IF NOT EXISTS hiring_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      job_id UUID,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#6366f1',
      position INTEGER NOT NULL,
      stage_type VARCHAR(50) DEFAULT 'custom',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`

       await sql`
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  title VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  location VARCHAR(255),
  remote_type VARCHAR(50),
  employment_type VARCHAR(50),

  experience_min INTEGER,
  experience_max INTEGER,

  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(10),

  description TEXT,
  requirements TEXT,
  benefits TEXT,

  status VARCHAR(50) DEFAULT 'draft',

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
`

await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department VARCHAR(255)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location VARCHAR(255)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote_type VARCHAR(50)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_min INTEGER`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_max INTEGER`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10)`
await sql`
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'pending'
`
await sql`
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS embedding_vector TEXT
`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'pending'`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding_vector TEXT`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements TEXT`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department VARCHAR(255)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location VARCHAR(255)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote_type VARCHAR(50)`
await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50)`

      await sql`CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      plan VARCHAR(50),
      status VARCHAR(50),
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`

      await sql`
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  action VARCHAR(100),
  credits_used INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
`
     
    
          // Fix missing columns (IMPORTANT for login/register)
      await sql`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS resume_credits_total INTEGER DEFAULT 25;
      `

      await sql`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS resume_credits_used INTEGER DEFAULT 0;
      `

            await sql`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS seats_included INTEGER DEFAULT 1;
      `

      await sql`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 1;
      `

    console.log('✅ Tables initialized!')
  } catch (err) {
    console.log('ℹ️ Tables already exist')
  }

  await testDbConnection()
  await initQueues()

  const PORT = Number(process.env.PORT) || 3001
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`🚀 Recruito API running on http://localhost:${PORT}`)
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})