import postgres from 'postgres'

// Use DATABASE_URL if available, otherwise fall back to individual variables
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'railway'}`

console.log(`📍 Connecting using connection string`)

export const sql = postgres(connectionString, {
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
    // Don't exit - let the app continue
  }
}

export function paginate(page: number = 1, limit: number = 20) {
  const safeLimit = Math.min(limit, 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit
  return { limit: safeLimit, offset }
}