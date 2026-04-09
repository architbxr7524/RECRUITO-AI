import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
})

// Queue for parsing uploaded resumes
export const resumeParseQueue = new Queue('resume-parse', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200
  }
})

// Queue for generating JD embeddings
export const jobEmbeddingQueue = new Queue('job-embedding', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 100
  }
})

// Queue for generating resume embeddings (triggered after parse)
export const resumeEmbeddingQueue = new Queue('resume-embedding', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})

// Queue for AI scoring (triggered after embedding)
export const scoringQueue = new Queue('candidate-scoring', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})

export async function initQueues() {
  // Verify Redis connection
  await connection.ping()
  console.log('✅ Redis queues initialized')
  return { resumeParseQueue, jobEmbeddingQueue, resumeEmbeddingQueue, scoringQueue }
}
