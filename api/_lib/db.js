import { neon } from '@neondatabase/serverless'

let cached = null

/**
 * Lazily-created Neon HTTP client.
 * Uses the pooled connection string from DATABASE_URL.
 */
export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!cached) cached = neon(process.env.DATABASE_URL)
  return cached
}
