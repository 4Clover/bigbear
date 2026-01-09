import { z } from 'zod'

/**
 * Environment variable validation schema
 * Validates all required env vars at startup to fail fast
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  AUTH_RESEND_KEY: z.string().min(1, 'AUTH_RESEND_KEY is required'),
  RESEND_FROM_EMAIL: z.email({ message: 'RESEND_FROM_EMAIL must be a valid email' }),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Security tokens
  ICAL_SECRET: z.string().min(16, 'ICAL_SECRET must be at least 16 characters'),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  // Upstash Redis (for rate limiting) - optional, falls back to in-memory
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Optional
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  OWNER_EMAIL: z.email().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables against the schema
 * @throws Error if validation fails with detailed messages
 */
export const validateEnv = (): Env => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Environment validation failed:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment configuration. Check the logs above for details.')
  }

  return result.data
}

// Singleton for validated env
let validatedEnv: Env | null = null

/**
 * Get validated environment variables
 * Validates on first call and caches the result
 */
export const env = (): Env => {
  validatedEnv ??= validateEnv()
  return validatedEnv
}
