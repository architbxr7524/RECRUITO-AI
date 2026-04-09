import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL ||
  'postgresql://recruito:recruito_secret@localhost:5432/recruito_dev'

// Main SQL client — used throughout the app
export const sql = postgres(connectionString, {
  max: 20,             // Connection pool size
  idle_timeout: 20,    // Close idle connections after 20s
  connect_timeout: 10, // Fail after 10s if can't connect
  transform: {
    // Auto-convert snake_case DB columns to camelCase in results
    column: postgres.camel as any
  }
})

export async function testDbConnection() {
  try {
    const result = await sql`SELECT NOW() as time`
    console.log(`✅ Database connected: ${result[0].time}`)
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    throw err
  }
}

// Helper: paginate queries
export function paginate(page: number = 1, limit: number = 20) {
  const safeLimit = Math.min(limit, 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit
  return { limit: safeLimit, offset }
}
