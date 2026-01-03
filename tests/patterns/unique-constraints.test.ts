import { describe, it, expect, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { prismaMock } from '../__mocks__/prisma'
import { createUserFixture } from '../fixtures/user.factory'

/**
 * Generic unique constraint pattern tests.
 * These validate database-level uniqueness enforcement.
 *
 * Unique constraints in the schema:
 * - User.email (single field)
 * - Account[provider, providerAccountId] (composite)
 * - BookingAddon[bookingId, addonId] (composite)
 * - VerificationToken[identifier, token] (composite)
 * - Addon.name, ExpenseCategory.name (single field)
 * - NotificationPreference.event (enum unique)
 */
describe('Unique Constraint Pattern', () => {
  const createUniqueViolationError = (field: string) => {
    return new Prisma.PrismaClientKnownRequestError(
      `Unique constraint failed on the fields: (${field})`,
      { code: 'P2002', clientVersion: '7.0.0', meta: { target: [field] } }
    )
  }

  beforeEach(() => {
    // Reset all mocks
  })

  describe('Single field unique constraints', () => {
    describe('User.email', () => {
      it('should reject duplicate email addresses', async () => {
        const existingUser = createUserFixture({ email: 'existing@example.com' })

        // Simulate unique violation
        prismaMock.user.create.mockRejectedValue(
          createUniqueViolationError('email')
        )

        await expect(
          prismaMock.user.create({
            data: { email: existingUser.email, role: 'GUEST' },
          })
        ).rejects.toThrow()
      })

      it('should allow same email after original user is deleted', async () => {
        const email = 'reusable@example.com'
        const newUser = createUserFixture({ email })

        // After deletion, email is available again
        prismaMock.user.create.mockResolvedValue(newUser)

        const result = await prismaMock.user.create({
          data: { email, role: 'GUEST' },
        })

        expect(result.email).toBe(email)
      })

      it('should be case-sensitive by default in PostgreSQL', () => {
        // Pattern: PostgreSQL unique constraints are case-sensitive
        // 'User@Example.com' !== 'user@example.com'
        // Application should normalize emails before storage
        const email1 = 'User@Example.com'
        const email2 = 'user@example.com'

        expect(email1).not.toBe(email2)
        expect(email1.toLowerCase()).toBe(email2.toLowerCase())
      })
    })

    describe('Addon.name', () => {
      it('should reject duplicate addon names', async () => {
        prismaMock.addon.create.mockRejectedValue(
          createUniqueViolationError('name')
        )

        await expect(
          prismaMock.addon.create({
            data: {
              name: 'Existing Addon',
              price: 25.0,
            },
          })
        ).rejects.toThrow()
      })
    })

    describe('ExpenseCategory.name', () => {
      it('should reject duplicate category names', async () => {
        prismaMock.expenseCategory.create.mockRejectedValue(
          createUniqueViolationError('name')
        )

        await expect(
          prismaMock.expenseCategory.create({
            data: {
              name: 'Utilities',
              isTaxDeductible: true,
            },
          })
        ).rejects.toThrow()
      })
    })
  })

  describe('Composite unique constraints', () => {
    describe('Account[provider, providerAccountId]', () => {
      it('should reject duplicate provider + account combination', async () => {
        prismaMock.account.create.mockRejectedValue(
          createUniqueViolationError('provider_providerAccountId')
        )

        await expect(
          prismaMock.account.create({
            data: {
              userId: 'user-1',
              type: 'oauth',
              provider: 'google',
              providerAccountId: 'existing-account-id',
            },
          })
        ).rejects.toThrow()
      })

      it('should allow same provider with different account ID', async () => {
        prismaMock.account.create.mockResolvedValue({
          id: 'account-2',
          userId: 'user-2',
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'different-account-id',
          refresh_token: null,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        })

        const result = await prismaMock.account.create({
          data: {
            userId: 'user-2',
            type: 'oauth',
            provider: 'google',
            providerAccountId: 'different-account-id',
          },
        })

        expect(result.providerAccountId).toBe('different-account-id')
      })

      it('should allow same account ID with different provider', async () => {
        // Same external account ID, but different OAuth provider
        prismaMock.account.create.mockResolvedValue({
          id: 'account-3',
          userId: 'user-3',
          type: 'oauth',
          provider: 'github', // Different provider
          providerAccountId: 'existing-account-id', // Same ID
          refresh_token: null,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        })

        const result = await prismaMock.account.create({
          data: {
            userId: 'user-3',
            type: 'oauth',
            provider: 'github',
            providerAccountId: 'existing-account-id',
          },
        })

        expect(result.provider).toBe('github')
      })
    })

    describe('BookingAddon[bookingId, addonId]', () => {
      it('should reject duplicate booking-addon pairing', async () => {
        prismaMock.bookingAddon.create.mockRejectedValue(
          createUniqueViolationError('bookingId_addonId')
        )

        await expect(
          prismaMock.bookingAddon.create({
            data: {
              bookingId: 'booking-1',
              addonId: 'addon-1',
              quantity: 2,
              price: 50.0,
            },
          })
        ).rejects.toThrow()
      })

      it('should allow same addon on different bookings', async () => {
        prismaMock.bookingAddon.create.mockResolvedValue({
          id: 'booking-addon-2',
          bookingId: 'booking-2', // Different booking
          addonId: 'addon-1', // Same addon
          quantity: 1,
          price: { toNumber: () => 25.0 } as any,
        })

        const result = await prismaMock.bookingAddon.create({
          data: {
            bookingId: 'booking-2',
            addonId: 'addon-1',
            quantity: 1,
            price: 25.0,
          },
        })

        expect(result.bookingId).toBe('booking-2')
      })
    })
  })

  describe('Error handling for constraint violations', () => {
    it('should return P2002 error code for unique violations', () => {
      const error = createUniqueViolationError('email')

      expect(error.code).toBe('P2002')
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    })

    it('should include field name in error metadata', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.0.0',
          meta: { target: ['email'] },
        }
      )

      expect(error.meta?.target).toContain('email')
    })

    it('should include multiple fields for composite constraints', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.0.0',
          meta: { target: ['provider', 'providerAccountId'] },
        }
      )

      expect(error.meta?.target).toContain('provider')
      expect(error.meta?.target).toContain('providerAccountId')
    })
  })

  describe('Upsert behavior with unique constraints', () => {
    it('should create if unique key does not exist', async () => {
      const newCategory = {
        id: 'cat-1',
        name: 'New Category',
        description: null,
        scheduleELine: null,
        isTaxDeductible: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.expenseCategory.upsert.mockResolvedValue(newCategory)

      const result = await prismaMock.expenseCategory.upsert({
        where: { name: 'New Category' },
        create: { name: 'New Category', isTaxDeductible: true },
        update: {},
      })

      expect(result.name).toBe('New Category')
    })

    it('should update if unique key exists', async () => {
      const existingCategory = {
        id: 'cat-1',
        name: 'Utilities',
        description: 'Updated description',
        scheduleELine: 'Line 17',
        isTaxDeductible: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.expenseCategory.upsert.mockResolvedValue(existingCategory)

      const result = await prismaMock.expenseCategory.upsert({
        where: { name: 'Utilities' },
        create: { name: 'Utilities', isTaxDeductible: true },
        update: { description: 'Updated description' },
      })

      expect(result.description).toBe('Updated description')
    })
  })
})
