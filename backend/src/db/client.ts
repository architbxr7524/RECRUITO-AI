import postgres from 'postgres'

// Railway automatically provides these env variables
const host = (process.env.PGHOST || 'localhost').trim()
const port = parseInt((process.env.PGPORT || '5432').trim())
const database = (process.env.PGDATABASE || 'railway').trim()
const user = (process.env.PGUSER || 'postgres').trim()
const password = (process.env.PGPASSWORD || '').trim()

console.log(`📍 Connecting to: ${host}:${port}/${database}`)

export const sql = postgres({
  host,
  port,
  database,
  user,
  password,
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    column: postgres.camel as any
  }
})

export async function testDbConnection() {
  try {
    const result = await sql`SELECT NOW() as time`
    console.log(`✅ Database connected: ${result[0].time}`)
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  }
}

export function paginate(page: number = 1, limit: number = 20) {
  const safeLimit = Math.min(limit, 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit
  return { limit: safeLimit, offset }
}