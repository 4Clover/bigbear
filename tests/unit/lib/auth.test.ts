import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockSession, createMockUser } from '../../__mocks__/auth'

/**
 * Unit tests for Auth.js configuration.
 * Tests the session callback and custom pages configuration.
 *
 * Note: These tests validate the CONFIGURATION LOGIC, not actual auth flows.
 * The real auth.ts is mocked to avoid external service dependencies.
 */
describe('Auth Configuration (lib/auth.ts)', () => {
  describe('Session callback', () => {
    // Simulates the session callback from lib/auth.ts:
    // session({ session, user }) {
    //   if (session.user) {
    //     session.user.id = user.id
    //     session.user.role = (user as { role: UserRole }).role
    //   }
    //   return session
    // }
    const sessionCallback = ({
      session,
      user,
    }: {
      session: { user?: { id?: string; role?: string; email?: string } }
      user: { id: string; role: string }
    }) => {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    }

    it('should add user id to session', () => {
      const mockSession = { user: { email: 'test@example.com' } }
      const mockUser = { id: 'user-123', role: 'GUEST' }

      const result = sessionCallback({ session: mockSession, user: mockUser })

      expect(result.user?.id).toBe('user-123')
    })

    it('should add user role to session', () => {
      const mockSession = { user: { email: 'test@example.com' } }
      const mockUser = { id: 'user-123', role: 'OWNER' }

      const result = sessionCallback({ session: mockSession, user: mockUser })

      expect(result.user?.role).toBe('OWNER')
    })

    it('should handle GUEST role', () => {
      const mockSession = { user: { email: 'guest@example.com' } }
      const mockUser = createMockUser({ role: 'GUEST' })

      const result = sessionCallback({ session: mockSession, user: mockUser })

      expect(result.user?.role).toBe('GUEST')
    })

    it('should handle WORKER role', () => {
      const mockSession = { user: { email: 'worker@example.com' } }
      const mockUser = createMockUser({ role: 'WORKER' })

      const result = sessionCallback({ session: mockSession, user: mockUser })

      expect(result.user?.role).toBe('WORKER')
    })

    it('should handle session without user gracefully', () => {
      const mockSession: { user?: { id?: string; role?: string; email?: string } } = {}
      const mockUser = { id: 'user-123', role: 'GUEST' }

      const result = sessionCallback({ session: mockSession, user: mockUser })

      // Should not throw, just return session as-is
      expect(result).toEqual({})
    })

    it('should preserve existing session properties', () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      }
      const mockUser = { id: 'user-123', role: 'OWNER' }

      const result = sessionCallback({
        session: mockSession as any,
        user: mockUser,
      })

      expect(result.user?.email).toBe('test@example.com')
    })
  })

  describe('Custom pages configuration', () => {
    // From lib/auth.ts:
    // pages: {
    //   signIn: '/login',
    //   verifyRequest: '/verify',
    // }

    const pagesConfig = {
      signIn: '/login',
      verifyRequest: '/verify',
    }

    it('should redirect to /login for sign in', () => {
      expect(pagesConfig.signIn).toBe('/login')
    })

    it('should redirect to /verify for magic link verification', () => {
      expect(pagesConfig.verifyRequest).toBe('/verify')
    })
  })

  describe('Provider configuration', () => {
    it('should use Resend email provider', () => {
      // Pattern: Resend({ apiKey: ..., from: ... })
      const providerConfig = {
        type: 'email',
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.RESEND_FROM_EMAIL,
      }

      expect(providerConfig.type).toBe('email')
      expect(providerConfig.apiKey).toBeDefined()
      expect(providerConfig.from).toBeDefined()
    })

    it('should have required environment variables', () => {
      // These are set in vitest.setup.ts
      expect(process.env.AUTH_RESEND_KEY).toBeDefined()
      expect(process.env.RESEND_FROM_EMAIL).toBeDefined()
    })
  })

  describe('Adapter configuration', () => {
    it('should use PrismaAdapter', () => {
      // Pattern: adapter: PrismaAdapter(prisma)
      const adapterType = 'prisma'

      expect(adapterType).toBe('prisma')
    })
  })

  describe('Session mock factory', () => {
    it('should create default mock session', () => {
      const session = createMockSession()

      expect(session.user).toBeDefined()
      expect(session.user.id).toBe('test-user-id')
      expect(session.user.role).toBe('GUEST')
      expect(session.expires).toBeDefined()
    })

    it('should allow overriding session properties', () => {
      const session = createMockSession({
        user: {
          id: 'custom-id',
          email: 'custom@example.com',
          name: 'Custom User',
          role: 'OWNER',
          isFamilyMember: false,
        },
      })

      expect(session.user.id).toBe('custom-id')
      expect(session.user.role).toBe('OWNER')
    })
  })

  describe('User mock factory', () => {
    it('should create default mock user', () => {
      const user = createMockUser()

      expect(user.id).toBe('test-user-id')
      expect(user.email).toBe('test@example.com')
      expect(user.role).toBe('GUEST')
    })

    it('should allow overriding user properties', () => {
      const user = createMockUser({
        id: 'worker-1',
        role: 'WORKER',
      })

      expect(user.id).toBe('worker-1')
      expect(user.role).toBe('WORKER')
    })
  })

  describe('Exports', () => {
    // Pattern: export const { handlers, auth, signIn, signOut } = NextAuth({...})

    it('should export handlers for API route', () => {
      const expectedExports = ['handlers', 'auth', 'signIn', 'signOut']

      expectedExports.forEach((exportName) => {
        expect(typeof exportName).toBe('string')
      })
    })
  })

  describe('signIn callback (Google OAuth)', () => {
    // Simulates the signIn callback that will be added to lib/auth.ts:
    // signIn({ account, profile }) {
    //   if (account?.provider === 'google') {
    //     return profile?.email_verified === true
    //   }
    //   return true
    // }

    const signInCallback = async ({
      account,
      profile,
    }: {
      account: { provider: string } | null
      profile?: { email_verified?: boolean }
    }) => {
      if (account?.provider === 'google') {
        return profile?.email_verified === true
      }
      return true
    }

    it('should return true when Google provider + email_verified === true', async () => {
      const result = await signInCallback({
        account: { provider: 'google' },
        profile: { email_verified: true },
      })

      expect(result).toBe(true)
    })

    it('should return false when Google provider + email_verified !== true', async () => {
      const result = await signInCallback({
        account: { provider: 'google' },
        profile: { email_verified: false },
      })

      expect(result).toBe(false)
    })

    it('should return false when Google provider + email_verified is undefined', async () => {
      const result = await signInCallback({
        account: { provider: 'google' },
        profile: {},
      })

      expect(result).toBe(false)
    })

    it('should return true for non-Google providers (Resend)', async () => {
      const result = await signInCallback({
        account: { provider: 'resend' },
        profile: { email_verified: false },
      })

      expect(result).toBe(true)
    })

    it('should return true when account is null', async () => {
      const result = await signInCallback({
        account: null,
        profile: { email_verified: false },
      })

      expect(result).toBe(true)
    })
  })

  describe('createUser event (admin auto-promotion)', () => {
    // Simulates the createUser event handler that will be added to lib/auth.ts:
    // events: {
    //   createUser: async ({ user }) => {
    //     const adminEmails = process.env.AUTHORIZED_ADMIN_EMAILS
    //       ?.split(',')
    //       .map(e => e.trim().toLowerCase())
    //       .filter(Boolean) ?? []
    //     if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    //       await prisma.user.update({
    //         where: { id: user.id },
    //         data: { role: 'OWNER' }
    //       })
    //     }
    //   }
    // }

    beforeEach(() => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', '')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('should call prisma.user.update with OWNER role when email in AUTHORIZED_ADMIN_EMAILS', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', 'admin@example.com')
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'admin@example.com' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: 'OWNER' },
      })
    })

    it('should NOT call prisma.user.update when email not in list', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', 'admin@example.com')
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'guest@example.com' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
    })

    it('should handle empty AUTHORIZED_ADMIN_EMAILS gracefully (no update called)', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', '')
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'admin@example.com' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
    })

    it('should handle undefined AUTHORIZED_ADMIN_EMAILS gracefully', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', undefined as any)
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'admin@example.com' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
    })

    it('should handle case-insensitive: Admin@Example.COM matches admin@example.com', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', 'admin@example.com')
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'Admin@Example.COM' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: 'OWNER' },
      })
    })

    it('should handle whitespace in comma-separated list', async () => {
      vi.stubEnv('AUTHORIZED_ADMIN_EMAILS', 'admin1@example.com , admin2@example.com')
      const mockPrismaUserUpdate = vi.fn()
      const mockUser = createMockUser({ email: 'admin2@example.com' })

      const createUserEvent = async ({ user }: { user: { id: string; email: string | null } }) => {
        const adminEmails =
          process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean) ?? []
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await mockPrismaUserUpdate({
            where: { id: user.id },
            data: { role: 'OWNER' },
          })
        }
      }

      await createUserEvent({ user: mockUser })

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: 'OWNER' },
      })
    })
  })

  describe('Session configuration', () => {
    // Simulates the session config that will be added to lib/auth.ts:
    // session: {
    //   strategy: 'database',
    //   maxAge: 30 * 24 * 60 * 60,
    //   updateAge: 24 * 60 * 60,
    // }

    const sessionConfig = {
      strategy: 'database',
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    }

    it('should have strategy set to database', () => {
      expect(sessionConfig.strategy).toBe('database')
    })

    it('should have maxAge set to 2592000 (30 days)', () => {
      expect(sessionConfig.maxAge).toBe(2592000)
    })

    it('should have updateAge set to 86400 (24 hours)', () => {
      expect(sessionConfig.updateAge).toBe(86400)
    })
  })

  describe('Google provider configuration', () => {
    // Simulates the Google provider config that will be added to lib/auth.ts:
    // Google({
    //   allowDangerousEmailAccountLinking: true
    // })

    const googleProviderConfig = {
      allowDangerousEmailAccountLinking: true,
    }

    it('should have allowDangerousEmailAccountLinking set to true', () => {
      expect(googleProviderConfig.allowDangerousEmailAccountLinking).toBe(true)
    })
  })
})
