import { vi } from 'vitest'
import type { Session } from 'next-auth'

type UserRole = 'OWNER' | 'GUEST' | 'WORKER'

interface MockUser {
  id: string
  email: string
  name: string | null
  role: UserRole
}

interface MockSession extends Session {
  user: MockUser
}

export const createMockSession = (
  overrides: Partial<MockSession> = {}
): MockSession => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'GUEST',
    ...overrides.user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

export const createMockUser = (
  overrides: Partial<MockUser> = {}
): MockUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'GUEST',
  ...overrides,
})

export const mockAuth = vi.fn().mockResolvedValue(createMockSession())
export const mockSignIn = vi.fn()
export const mockSignOut = vi.fn()

export const handlers = {
  GET: vi.fn(),
  POST: vi.fn(),
}
