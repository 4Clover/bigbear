import { vi } from 'vitest'

export const mockEnvValues = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  AUTH_SECRET: 'test-auth-secret',
  AUTH_URL: 'http://localhost:3000',
  AUTH_RESEND_KEY: 'test-resend-key',
  RESEND_FROM_EMAIL: 'test@example.com',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  ICAL_SECRET: 'test-ical-secret-1234567890',
  CRON_SECRET: 'test-cron-secret-1234567890',
  TWILIO_ACCOUNT_SID: 'ACtest1234567890123456789012345678',
  TWILIO_AUTH_TOKEN: 'test-twilio-auth-token-32-chars-long',
  TWILIO_PHONE_NUMBER: '+15555555555',
  OWNER_EMAIL: 'owner@test.com',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}

export const env = vi.fn(() => ({ ...mockEnvValues }))
export const validateEnv = vi.fn(() => ({ ...mockEnvValues }))
