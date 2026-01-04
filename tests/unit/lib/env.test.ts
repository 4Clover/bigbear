import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

// Valid test environment
const validEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  AUTH_SECRET: 'test-auth-secret-32-chars-minimum',
  AUTH_RESEND_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'test@example.com',
  STRIPE_SECRET_KEY: 'sk_test_1234567890',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890',
  ICAL_SECRET: 'ical-secret-16chars',
  CRON_SECRET: 'cron-secret-16chars',
}

describe('Environment Variable Validation', () => {
  beforeEach(() => {
    // Reset module cache to re-run validation
    vi.resetModules()
    // Set up valid env by default
    process.env = { ...originalEnv, ...validEnv }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('validateEnv', () => {
    it('should pass with all required variables present', async () => {
      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).not.toThrow()
    })

    it('should return parsed environment variables', async () => {
      const { validateEnv } = await import('@/lib/env')
      const env = validateEnv()

      expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL)
      expect(env.STRIPE_SECRET_KEY).toBe(validEnv.STRIPE_SECRET_KEY)
    })

    it('should throw when DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should throw when STRIPE_SECRET_KEY has invalid format', async () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_key'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should throw when STRIPE_WEBHOOK_SECRET has invalid format', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'invalid_secret'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should throw when RESEND_FROM_EMAIL is not a valid email', async () => {
      process.env.RESEND_FROM_EMAIL = 'not-an-email'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should throw when ICAL_SECRET is too short', async () => {
      process.env.ICAL_SECRET = 'short'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should throw when CRON_SECRET is too short', async () => {
      process.env.CRON_SECRET = 'short'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })

    it('should allow missing optional variables', async () => {
      // Optional vars should not cause failure
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      delete process.env.BLOB_READ_WRITE_TOKEN
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.OWNER_EMAIL

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).not.toThrow()
    })

    it('should validate optional OWNER_EMAIL as email format when present', async () => {
      process.env.OWNER_EMAIL = 'not-an-email'

      const { validateEnv } = await import('@/lib/env')
      expect(() => validateEnv()).toThrow('Invalid environment configuration')
    })
  })

  describe('env() singleton', () => {
    it('should return the same validated env on multiple calls', async () => {
      const { env } = await import('@/lib/env')

      const env1 = env()
      const env2 = env()

      expect(env1).toBe(env2)
    })
  })
})
