import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from './tests/__mocks__/prisma'

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

// Mock environment variables for testing
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DIRECT_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing')
vi.stubEnv('AUTH_RESEND_KEY', 'test-resend-key')
vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com')
vi.stubEnv('AUTH_URL', 'http://localhost:3000')
vi.stubEnv('AUTH_GOOGLE_ID', 'test-google-client-id')
vi.stubEnv('AUTH_GOOGLE_SECRET', 'test-google-secret')
vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', 'admin@example.com')
