import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../__mocks__/prisma'
import { mockAuth, createMockSession } from '../../__mocks__/auth'
import { Prisma } from '@prisma/client'

// Prisma client extension now converts Decimals to plain numbers
const mockDecimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value)

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

// Create hoisted mock references
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('@/lib/blob', () => ({
  deleteBlob: mockDeleteBlob,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

// Silence console.error for expected blob deletion failures in tests
vi.spyOn(console, 'error').mockImplementation(() => undefined)

import { createExpense, updateTransaction, deleteTransaction } from '@/actions/finance'
import { generateScheduleEReport } from '@/actions/reports'

// Helper to create mock transaction with category and receipts (for Schedule E tests)
const createMockTransactionWithCategory = (
  overrides: Partial<{
    id: string
    type: 'INCOME' | 'EXPENSE'
    amount: number
    date: Date
    description: string
    vendor: string
    categoryId: string
    category: { id: string; name: string; scheduleELine: string | null; isTaxDeductible: boolean }
    receipts: unknown[]
  }> = {}
) => ({
  id: overrides.id ?? 'tx-1',
  type: overrides.type ?? 'EXPENSE',
  amount: overrides.amount ?? 100,
  date: overrides.date ?? new Date('2024-06-15'),
  description: overrides.description ?? 'Test expense',
  vendor: overrides.vendor ?? 'Test Vendor',
  categoryId: overrides.categoryId ?? 'cat-1',
  bookingId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: overrides.category ?? {
    id: 'cat-1',
    name: 'Utilities',
    scheduleELine: 'Line 17',
    isTaxDeductible: true,
    description: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  receipts: overrides.receipts ?? [],
})

describe('Taxes Tab Persistence', () => {
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
  // updateTransaction TESTS (Taxes Tab)
  // =============================================================================
  describe('updateTransaction', () => {
    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(updateTransaction('tx-1', { amount: 100 })).rejects.toThrow('Unauthorized')
    })

    it('should update transaction with valid data', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(100),
        date: new Date(),
        description: 'Updated',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      const result = await updateTransaction('tx-1', { amount: 100, description: 'Updated' })

      expect(result.success).toBe(true)
      expect(result.transaction).toBeDefined()
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { amount: 100, description: 'Updated' },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })
  })

  // =============================================================================
  // createExpense TESTS (Taxes Tab)
  // =============================================================================
  describe('createExpense', () => {
    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(
        createExpense({
          categoryId: 'cat-1',
          amount: 100,
          date: new Date(),
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should create expense with valid data', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      const mockTransaction = {
        id: 'tx-new',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(250),
        date: new Date(),
        description: 'Office supplies',
        vendor: 'Staples',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 250,
        date: new Date(),
        description: 'Office supplies',
        vendor: 'Staples',
      })

      expect(result.success).toBe(true)
      expect(result.transaction).toEqual({
        ...mockTransaction,
        amount: Number(mockTransaction.amount),
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should return errors for invalid data (missing required field)', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      const result = await createExpense({
        categoryId: '',
        amount: -50,
        date: new Date(),
      })

      expect(result.errors).toBeDefined()
      expect(result.success).toBeUndefined()
    })
  })

  // =============================================================================
  // deleteTransaction TESTS (Taxes Tab)
  // =============================================================================
  describe('deleteTransaction', () => {
    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(deleteTransaction('tx-1')).rejects.toThrow('Unauthorized')
    })

    it('should delete transaction with valid id', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      prismaMock.receipt.findMany.mockResolvedValueOnce([])
      prismaMock.receipt.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.transaction.delete.mockResolvedValueOnce({
        id: 'tx-1',
        type: 'EXPENSE',
        categoryId: 'cat-1',
        amount: mockDecimal(100),
        date: new Date(),
        description: null,
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await deleteTransaction('tx-1')

      expect(result.success).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })
  })

  // =============================================================================
  // generateScheduleEReport TESTS (Taxes Tab)
  // =============================================================================
  describe('generateScheduleEReport', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should return object with lineItems array and totalExpenses number', async () => {
      const expenseTransactions = [
        createMockTransactionWithCategory({
          id: 'tx-1',
          type: 'EXPENSE',
          amount: 400,
          category: {
            id: 'cat-util',
            name: 'Utilities',
            scheduleELine: 'Line 17',
            isTaxDeductible: true,
          },
        }),
        createMockTransactionWithCategory({
          id: 'tx-2',
          type: 'EXPENSE',
          amount: 300,
          category: {
            id: 'cat-repairs',
            name: 'Repairs',
            scheduleELine: 'Line 14',
            isTaxDeductible: true,
          },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(expenseTransactions as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: 5000 },
      } as never)

      const result = await generateScheduleEReport(2024)

      expect(result.year).toBe(2024)
      expect(result.rentalIncome).toBe(5000)
      expect(Array.isArray(result.lineItems)).toBe(true)
      expect(typeof result.totalExpenses).toBe('number')
      expect(result.totalExpenses).toBe(700)
      expect(result.lineItems).toHaveLength(2)
    })

    it('should have correct lineItem structure with line, categories, total, transactions', async () => {
      const expenseTransactions = [
        createMockTransactionWithCategory({
          id: 'tx-1',
          type: 'EXPENSE',
          amount: 200,
          category: {
            id: 'cat-util',
            name: 'Utilities',
            scheduleELine: 'Line 17',
            isTaxDeductible: true,
          },
        }),
        createMockTransactionWithCategory({
          id: 'tx-2',
          type: 'EXPENSE',
          amount: 150,
          category: {
            id: 'cat-water',
            name: 'Water',
            scheduleELine: 'Line 17',
            isTaxDeductible: true,
          },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(expenseTransactions as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: 0 },
      } as never)

      const result = await generateScheduleEReport(2024)

      expect(result.lineItems).toHaveLength(1)

      const lineItem = result.lineItems[0]
      expect(lineItem).toBeDefined()
      expect(lineItem?.line).toBe('Line 17')
      expect(lineItem?.categories).toContain('Utilities')
      expect(lineItem?.categories).toContain('Water')
      expect(lineItem?.total).toBe(350)
      expect(lineItem?.transactions).toHaveLength(2)
    })

    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(generateScheduleEReport(2024)).rejects.toThrow('Unauthorized')
    })
  })
})
