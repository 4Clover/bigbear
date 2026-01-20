import { z } from 'zod'

/**
 * Environment variable validation schema
 * Validates all required env vars at startup to fail fast
 */
const envSchema = z
  .object({
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

    // Twilio SMS - optional, but if any is set, all must be set
    TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'TWILIO_ACCOUNT_SID must start with AC').optional(),
    TWILIO_AUTH_TOKEN: z.string().min(32, 'TWILIO_AUTH_TOKEN must be at least 32 characters').optional(),
    TWILIO_PHONE_NUMBER: z
      .string()
      .regex(/^\+\d{10,15}$/, 'TWILIO_PHONE_NUMBER must be in E.164 format (e.g., +15551234567)')
      .optional(),

    // Upstash Redis (for rate limiting) - optional, falls back to in-memory
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Optional
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    OWNER_EMAIL: z.email({ message: 'OWNER_EMAIL must be a valid email' }),
  })
  .refine((data) => data.ICAL_SECRET !== data.CRON_SECRET, {
    message: 'ICAL_SECRET and CRON_SECRET must be different values for security',
    path: ['CRON_SECRET'],
  })
  .refine(
    (data) => {
      const twilioVars = [data.TWILIO_ACCOUNT_SID, data.TWILIO_AUTH_TOKEN, data.TWILIO_PHONE_NUMBER]
      const setCount = twilioVars.filter(Boolean).length
      return setCount === 0 || setCount === 3
    },
    {
      message: 'If any Twilio credential is set, all three must be set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)',
      path: ['TWILIO_ACCOUNT_SID'],
    }
  )

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
