import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../__mocks__/prisma'
import { mockAuth, createMockSession } from '../../__mocks__/auth'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { importExpensesFromCsv } from '@/actions/finance'

describe('importExpensesFromCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(prismaMock.$transaction as any).mockImplementation(async (fnOrArray: unknown) => {
      if (typeof fnOrArray === 'function') {
        return (fnOrArray as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock)
      }
      return Promise.all(fnOrArray as Promise<unknown>[])
    })
  })

  // =============================================================================
  // AUTHORIZATION
  // =============================================================================
  describe('Authorization', () => {
    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(
        importExpensesFromCsv([
          {
            date: new Date(),
            description: 'Test',
            amount: 50,
            categoryId: 'cat-1',
          },
        ])
      ).rejects.toThrow('Unauthorized')
    })

    it('should reject GUEST role', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(
        importExpensesFromCsv([
          {
            date: new Date(),
            description: 'Test',
            amount: 50,
            categoryId: 'cat-1',
          },
        ])
      ).rejects.toThrow('Unauthorized')
    })

    it('should reject WORKER role', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '4', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(
        importExpensesFromCsv([
          {
            date: new Date(),
            description: 'Test',
            amount: 50,
            categoryId: 'cat-1',
          },
        ])
      ).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // VALIDATION
  // =============================================================================
  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should reject negative amounts (Zod requires positive)', async () => {
      const result = await importExpensesFromCsv([
        {
          date: new Date(),
          description: 'Negative amount',
          amount: -50,
          categoryId: 'cat-1',
        },
      ])

      expect(result.created).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toBe('Invalid input data')
    })

    it('should reject zero amount (Zod requires positive)', async () => {
      const result = await importExpensesFromCsv([
        {
          date: new Date(),
          description: 'Zero amount',
          amount: 0,
          categoryId: 'cat-1',
        },
      ])

      expect(result.created).toBe(0)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject empty description', async () => {
      const result = await importExpensesFromCsv([
        {
          date: new Date(),
          description: '',
          amount: 50,
          categoryId: 'cat-1',
        },
      ])

      expect(result.created).toBe(0)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject empty categoryId', async () => {
      const result = await importExpensesFromCsv([
        {
          date: new Date(),
          description: 'Test',
          amount: 50,
          categoryId: '',
        },
      ])

      expect(result.created).toBe(0)
      expect(result.errors).toHaveLength(1)
    })
  })

  // =============================================================================
  // SUCCESSFUL IMPORT
  // =============================================================================
  describe('Successful import', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should create 3 unique rows successfully', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: new Date(),
        description: 'Test',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const rows = [
        { date: new Date('2024-06-01'), description: 'Expense A', amount: 50, categoryId: 'cat-1' },
        { date: new Date('2024-06-02'), description: 'Expense B', amount: 75, categoryId: 'cat-2' },
        {
          date: new Date('2024-06-03'),
          description: 'Expense C',
          amount: 100,
          categoryId: 'cat-1',
        },
      ]

      const result = await importExpensesFromCsv(rows)

      expect(result.created).toBe(3)
      expect(result.skipped).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(prismaMock.transaction.findFirst).toHaveBeenCalledTimes(3)
      expect(prismaMock.transaction.create).toHaveBeenCalledTimes(3)
    })

    it('should pass correct data to prisma.transaction.create', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(99.99),
        date: new Date('2024-06-15'),
        description: 'Office supplies',
        vendor: 'Staples',
        bookingId: null,
        notes: 'Tax deductible',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await importExpensesFromCsv([
        {
          date: new Date('2024-06-15'),
          description: 'Office supplies',
          vendor: 'Staples',
          amount: 99.99,
          categoryId: 'cat-1',
          notes: 'Tax deductible',
        },
      ])

      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'EXPENSE',
          categoryId: 'cat-1',
          amount: 99.99,
          date: new Date('2024-06-15'),
          description: 'Office supplies',
          vendor: 'Staples',
          notes: 'Tax deductible',
        },
      })
    })

    it('should call revalidatePath after import', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: new Date(),
        description: 'Test',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await importExpensesFromCsv([
        { date: new Date(), description: 'Test', amount: 50, categoryId: 'cat-1' },
      ])

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })
  })

  // =============================================================================
  // DUPLICATE DETECTION
  // =============================================================================
  describe('Duplicate detection', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should skip row when duplicate exists (same date+amount+description)', async () => {
      const existingDate = new Date('2024-06-15')

      prismaMock.transaction.findFirst.mockResolvedValue({
        id: 'tx-existing',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: existingDate,
        description: 'Already exists',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await importExpensesFromCsv([
        {
          date: existingDate,
          description: 'Already exists',
          amount: 50,
          categoryId: 'cat-1',
        },
      ])

      expect(result.created).toBe(0)
      expect(result.skipped).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(prismaMock.transaction.create).not.toHaveBeenCalled()
    })

    it('should check duplicate with correct where clause', async () => {
      const importDate = new Date('2024-06-15')
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(75),
        date: importDate,
        description: 'Check query',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await importExpensesFromCsv([
        { date: importDate, description: 'Check query', amount: 75, categoryId: 'cat-1' },
      ])

      expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          date: importDate,
          amount: 75,
          description: 'Check query',
        },
      })
    })

    it('should handle mix of new and duplicate rows', async () => {
      prismaMock.transaction.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'tx-existing',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          amount: new Prisma.Decimal(50),
          date: new Date('2024-06-02'),
          description: 'Duplicate',
          vendor: null,
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null)

      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: new Date(),
        description: 'New',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await importExpensesFromCsv([
        { date: new Date('2024-06-01'), description: 'New A', amount: 30, categoryId: 'cat-1' },
        { date: new Date('2024-06-02'), description: 'Duplicate', amount: 50, categoryId: 'cat-1' },
        { date: new Date('2024-06-03'), description: 'New B', amount: 70, categoryId: 'cat-2' },
      ])

      expect(result.created).toBe(2)
      expect(result.skipped).toBe(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  describe('Error handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should handle optional vendor and notes fields', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: new Date(),
        description: 'Minimal row',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await importExpensesFromCsv([
        { date: new Date(), description: 'Minimal row', amount: 50, categoryId: 'cat-1' },
      ])

      expect(result.created).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should coerce date strings via Zod', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.transaction.create.mockResolvedValue({
        id: 'tx-new',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: new Prisma.Decimal(50),
        date: new Date('2024-06-15'),
        description: 'Date coercion',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await importExpensesFromCsv([
        {
          date: '2024-06-15' as any,
          description: 'Date coercion',
          amount: 50,
          categoryId: 'cat-1',
        },
      ])

      expect(result.created).toBe(1)
    })
  })
})
