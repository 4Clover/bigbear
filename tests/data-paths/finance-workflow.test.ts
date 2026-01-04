import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { mockAuth, createMockSession } from '../__mocks__/auth'

// Helper to create mock Decimal values that satisfy Prisma's Decimal type
const mockDecimal = (value: number) =>
  ({
    toNumber: () => value,
    toString: () => value.toString(),
    valueOf: () => value,
  }) as never

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

import {
  createExpense,
  updateTransaction,
  deleteTransaction,
  addReceiptToTransaction,
  deleteReceipt,
  getTransactions,
  getFinanceSummary,
} from '@/actions/finance'

/**
 * Finance workflow data path tests.
 * Tests complete transaction and receipt lifecycles:
 * - Full expense lifecycle (create → update → delete)
 * - Receipt attachment lifecycle (upload → attach → view → delete)
 * - Transaction cascade behavior
 * - Multi-receipt scenarios
 * - Financial reporting accuracy
 */
describe('Finance Workflow Data Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(
      createMockSession({
        user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
      })
    )
  })

  // =============================================================================
  // EXPENSE LIFECYCLE
  // =============================================================================
  describe('Expense Lifecycle: Create → Update → Delete', () => {
    it('should complete full expense lifecycle without receipts', async () => {
      const transactionId = 'tx-lifecycle-1'
      const categoryId = 'cat-utilities'
      const initialDate = new Date('2024-06-15')

      // Step 1: Create expense
      const createdTransaction = {
        id: transactionId,
        type: 'EXPENSE' as const,
        categoryId,
        amount: mockDecimal(150),
        date: initialDate,
        description: 'Electric bill',
        vendor: 'Power Co',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(createdTransaction)

      const createResult = await createExpense({
        categoryId,
        amount: 150,
        date: initialDate,
        description: 'Electric bill',
        vendor: 'Power Co',
      })

      expect(createResult.success).toBe(true)
      expect(createResult.transaction.id).toBe(transactionId)

      // Step 2: Update expense
      const updatedTransaction = {
        ...createdTransaction,
        amount: mockDecimal(175),
        description: 'Electric bill - adjusted',
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(updatedTransaction)

      const updateResult = await updateTransaction(transactionId, {
        amount: 175,
        description: 'Electric bill - adjusted',
      })

      expect(updateResult.success).toBe(true)
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { amount: 175, description: 'Electric bill - adjusted' },
      })

      // Step 3: Delete expense
      prismaMock.receipt.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.delete.mockResolvedValueOnce(updatedTransaction)

      const deleteResult = await deleteTransaction(transactionId)

      expect(deleteResult.success).toBe(true)
      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      })

      // Verify cache was revalidated at each step
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should complete full expense lifecycle with multiple receipts', async () => {
      const transactionId = 'tx-lifecycle-2'
      const initialDate = new Date('2024-06-20')

      // Step 1: Create expense with multiple receipts
      const createdTransaction = {
        id: transactionId,
        type: 'EXPENSE' as const,
        categoryId: 'cat-repairs',
        amount: mockDecimal(500),
        date: initialDate,
        description: 'HVAC repair',
        vendor: 'AC Service Co',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(createdTransaction)
      prismaMock.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId,
        fileUrl: 'https://blob.test/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })

      const createResult = await createExpense({
        categoryId: 'cat-repairs',
        amount: 500,
        date: initialDate,
        description: 'HVAC repair',
        vendor: 'AC Service Co',
        receiptUrls: [
          'https://blob.test/invoice.pdf',
          'https://blob.test/before-photo.jpg',
          'https://blob.test/after-photo.jpg',
        ],
      })

      expect(createResult.success).toBe(true)
      expect(prismaMock.receipt.create).toHaveBeenCalledTimes(3)

      // Step 2: Delete expense - should cascade delete blobs
      const attachedReceipts = [
        {
          id: 'receipt-1',
          transactionId,
          fileUrl: 'https://blob.test/invoice.pdf',
          fileName: 'invoice.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
        {
          id: 'receipt-2',
          transactionId,
          fileUrl: 'https://blob.test/before-photo.jpg',
          fileName: 'before-photo.jpg',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
        {
          id: 'receipt-3',
          transactionId,
          fileUrl: 'https://blob.test/after-photo.jpg',
          fileName: 'after-photo.jpg',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
      ]

      prismaMock.receipt.findMany.mockResolvedValueOnce(attachedReceipts)
      prismaMock.transaction.delete.mockResolvedValueOnce(createdTransaction)

      const deleteResult = await deleteTransaction(transactionId)

      expect(deleteResult.success).toBe(true)
      expect(mockDeleteBlob).toHaveBeenCalledTimes(3)
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/invoice.pdf')
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/before-photo.jpg')
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/after-photo.jpg')
    })
  })

  // =============================================================================
  // RECEIPT LIFECYCLE
  // =============================================================================
  describe('Receipt Lifecycle: Attach → View → Delete', () => {
    it('should complete full receipt lifecycle', async () => {
      const transactionId = 'tx-with-receipts'
      const receiptId = 'receipt-lifecycle-1'
      const fileUrl = 'https://blob.test/expense-receipt.pdf'

      // Step 1: Add receipt to existing transaction
      const createdReceipt = {
        id: receiptId,
        transactionId,
        fileUrl,
        fileName: 'expense-receipt.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      }

      prismaMock.receipt.create.mockResolvedValueOnce(createdReceipt)

      const addResult = await addReceiptToTransaction(transactionId, {
        fileUrl,
        fileName: 'expense-receipt.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
      })

      expect(addResult.success).toBe(true)
      expect(addResult.receipt.id).toBe(receiptId)

      // Step 2: Verify receipt is returned when fetching transactions
      const mockCategory = {
        id: 'cat-1',
        name: 'Utilities',
        description: null,
        scheduleELine: null,
        isTaxDeductible: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.findMany.mockResolvedValueOnce([
        {
          id: transactionId,
          type: 'EXPENSE' as const,
          categoryId: 'cat-1',
          amount: mockDecimal(100),
          date: new Date(),
          description: null,
          vendor: null,
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: mockCategory,
          receipts: [createdReceipt],
        },
      ] as never)

      const transactions = await getTransactions()
      expect(transactions[0]?.receipts).toHaveLength(1)
      expect(transactions[0]?.receipts?.[0]?.id).toBe(receiptId)

      // Step 3: Delete the receipt
      prismaMock.receipt.findUnique.mockResolvedValueOnce(createdReceipt)
      prismaMock.receipt.delete.mockResolvedValueOnce(createdReceipt)

      const deleteResult = await deleteReceipt(receiptId)

      expect(deleteResult.success).toBe(true)
      expect(mockDeleteBlob).toHaveBeenCalledWith(fileUrl)
      expect(prismaMock.receipt.delete).toHaveBeenCalledWith({
        where: { id: receiptId },
      })
    })

    it('should handle multiple receipts attached to same transaction', async () => {
      const transactionId = 'tx-multi-receipt'

      // Add first receipt
      prismaMock.receipt.create.mockResolvedValueOnce({
        id: 'receipt-1',
        transactionId,
        fileUrl: 'https://blob.test/receipt1.pdf',
        fileName: 'receipt1.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })

      await addReceiptToTransaction(transactionId, {
        fileUrl: 'https://blob.test/receipt1.pdf',
        fileName: 'receipt1.pdf',
      })

      // Add second receipt
      prismaMock.receipt.create.mockResolvedValueOnce({
        id: 'receipt-2',
        transactionId,
        fileUrl: 'https://blob.test/receipt2.jpg',
        fileName: 'receipt2.jpg',
        fileSize: null,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
      })

      await addReceiptToTransaction(transactionId, {
        fileUrl: 'https://blob.test/receipt2.jpg',
        fileName: 'receipt2.jpg',
        mimeType: 'image/jpeg',
      })

      // Add third receipt
      prismaMock.receipt.create.mockResolvedValueOnce({
        id: 'receipt-3',
        transactionId,
        fileUrl: 'https://blob.test/receipt3.png',
        fileName: 'receipt3.png',
        fileSize: null,
        mimeType: 'image/png',
        createdAt: new Date(),
      })

      await addReceiptToTransaction(transactionId, {
        fileUrl: 'https://blob.test/receipt3.png',
        fileName: 'receipt3.png',
        mimeType: 'image/png',
      })

      expect(prismaMock.receipt.create).toHaveBeenCalledTimes(3)
    })
  })

  // =============================================================================
  // TRANSACTION CASCADE BEHAVIOR
  // =============================================================================
  describe('Transaction Cascade Behavior', () => {
    it('should handle blob deletion failure gracefully during transaction delete', async () => {
      const transactionId = 'tx-blob-fail'

      const receipts = [
        {
          id: 'receipt-fail-1',
          transactionId,
          fileUrl: 'https://blob.test/missing-file.pdf',
          fileName: 'missing-file.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
        {
          id: 'receipt-fail-2',
          transactionId,
          fileUrl: 'https://blob.test/existing-file.pdf',
          fileName: 'existing-file.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
      ]

      prismaMock.receipt.findMany.mockResolvedValueOnce(receipts)

      // First blob fails, second succeeds
      mockDeleteBlob
        .mockRejectedValueOnce(new Error('Blob not found'))
        .mockResolvedValueOnce(undefined)

      prismaMock.transaction.delete.mockResolvedValueOnce({
        id: transactionId,
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

      const result = await deleteTransaction(transactionId)

      // Transaction should still be deleted despite blob failure
      expect(result.success).toBe(true)
      expect(mockDeleteBlob).toHaveBeenCalledTimes(2)
      expect(prismaMock.transaction.delete).toHaveBeenCalled()
    })

    it('should not delete blobs when deleting receipt fails', async () => {
      // Receipt not found - should not attempt blob deletion
      prismaMock.receipt.findUnique.mockResolvedValueOnce(null)

      await expect(deleteReceipt('non-existent-receipt')).rejects.toThrow('Receipt not found')

      expect(mockDeleteBlob).not.toHaveBeenCalled()
      expect(prismaMock.receipt.delete).not.toHaveBeenCalled()
    })
  })

  // =============================================================================
  // FINANCIAL REPORTING ACCURACY
  // =============================================================================
  describe('Financial Reporting Accuracy', () => {
    it('should accurately calculate running totals across multiple transactions', async () => {
      const rentalCategory = {
        id: 'cat-rental',
        name: 'Rental Income',
        description: null,
        scheduleELine: '3',
        isTaxDeductible: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const utilitiesCategory = {
        id: 'cat-utilities',
        name: 'Utilities',
        description: null,
        scheduleELine: '16',
        isTaxDeductible: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const repairsCategory = {
        id: 'cat-repairs',
        name: 'Repairs',
        description: null,
        scheduleELine: '14',
        isTaxDeductible: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Simulate a month with mixed transactions
      const transactions = [
        // Week 1: Rental income
        {
          id: 'tx-1',
          type: 'INCOME' as const,
          categoryId: 'cat-rental',
          amount: mockDecimal(800),
          date: new Date('2024-06-01'),
          description: 'Weekend rental',
          vendor: null,
          bookingId: 'booking-1',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: rentalCategory,
        },
        // Week 2: Utility expenses
        {
          id: 'tx-2',
          type: 'EXPENSE' as const,
          categoryId: 'cat-utilities',
          amount: mockDecimal(150),
          date: new Date('2024-06-08'),
          description: 'Electric bill',
          vendor: 'Power Co',
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: utilitiesCategory,
        },
        {
          id: 'tx-3',
          type: 'EXPENSE' as const,
          categoryId: 'cat-utilities',
          amount: mockDecimal(50),
          date: new Date('2024-06-10'),
          description: 'Water bill',
          vendor: 'Water Co',
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: utilitiesCategory,
        },
        // Week 3: Another rental + repair
        {
          id: 'tx-4',
          type: 'INCOME' as const,
          categoryId: 'cat-rental',
          amount: mockDecimal(1200),
          date: new Date('2024-06-15'),
          description: 'Week-long rental',
          vendor: null,
          bookingId: 'booking-2',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: rentalCategory,
        },
        {
          id: 'tx-5',
          type: 'EXPENSE' as const,
          categoryId: 'cat-repairs',
          amount: mockDecimal(300),
          date: new Date('2024-06-18'),
          description: 'Plumber',
          vendor: 'Fix-It Plumbing',
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: repairsCategory,
        },
        // Week 4: More income
        {
          id: 'tx-6',
          type: 'INCOME' as const,
          categoryId: 'cat-rental',
          amount: mockDecimal(600),
          date: new Date('2024-06-28'),
          description: 'Weekend rental',
          vendor: null,
          bookingId: 'booking-3',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: rentalCategory,
        },
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const summary = await getFinanceSummary(2024, 6)

      // Income: 800 + 1200 + 600 = 2600
      expect(summary.income).toBe(2600)

      // Expenses: 150 + 50 + 300 = 500
      expect(summary.expenses).toBe(500)

      // Net: 2600 - 500 = 2100
      expect(summary.netIncome).toBe(2100)

      // Transaction count
      expect(summary.transactionCount).toBe(6)

      // By category:
      // Rental Income: +800 +1200 +600 = 2600
      // Utilities: -150 -50 = -200
      // Repairs: -300
      expect(summary.byCategory).toEqual({
        'Rental Income': 2600,
        Utilities: -200,
        Repairs: -300,
      })
    })

    it('should handle edge case of expenses exceeding income (negative net)', async () => {
      const rentalCategory = {
        id: 'cat-rental',
        name: 'Rental Income',
        description: null,
        scheduleELine: '3',
        isTaxDeductible: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const repairsCategory = {
        id: 'cat-repairs',
        name: 'Repairs',
        description: null,
        scheduleELine: '14',
        isTaxDeductible: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Low income month with major repair
      const transactions = [
        {
          id: 'tx-1',
          type: 'INCOME' as const,
          categoryId: 'cat-rental',
          amount: mockDecimal(500),
          date: new Date('2024-02-15'),
          description: 'Weekend rental',
          vendor: null,
          bookingId: 'booking-1',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: rentalCategory,
        },
        {
          id: 'tx-2',
          type: 'EXPENSE' as const,
          categoryId: 'cat-repairs',
          amount: mockDecimal(2500),
          date: new Date('2024-02-20'),
          description: 'New water heater',
          vendor: 'HVAC Pro',
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: repairsCategory,
        },
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const summary = await getFinanceSummary(2024, 2)

      expect(summary.income).toBe(500)
      expect(summary.expenses).toBe(2500)
      expect(summary.netIncome).toBe(-2000)
    })
  })

  // =============================================================================
  // FILTERING AND QUERIES
  // =============================================================================
  describe('Transaction Filtering Workflows', () => {
    it('should filter transactions by multiple criteria', async () => {
      const startDate = new Date('2024-06-01')
      const endDate = new Date('2024-06-30')

      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      await getTransactions({
        type: 'EXPENSE',
        categoryId: 'cat-utilities',
        startDate,
        endDate,
        search: 'electric',
      })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          type: 'EXPENSE',
          categoryId: 'cat-utilities',
          date: { gte: startDate, lte: endDate },
          OR: [
            { description: { contains: 'electric', mode: 'insensitive' } },
            { vendor: { contains: 'electric', mode: 'insensitive' } },
          ],
        },
        include: { category: true, receipts: true },
        orderBy: { date: 'desc' },
      })
    })

    it('should handle search across both description and vendor', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      await getTransactions({ search: 'power' })

      const call = prismaMock.transaction.findMany.mock.calls[0]?.[0]
      expect(call?.where?.OR).toEqual([
        { description: { contains: 'power', mode: 'insensitive' } },
        { vendor: { contains: 'power', mode: 'insensitive' } },
      ])
    })
  })

  // =============================================================================
  // AUTHORIZATION ACROSS WORKFLOW
  // =============================================================================
  describe('Authorization Consistency', () => {
    it('should enforce authorization throughout expense lifecycle', async () => {
      // Start as GUEST - should fail at create
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '99', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(
        createExpense({
          categoryId: 'cat-1',
          amount: 100,
          date: new Date(),
        })
      ).rejects.toThrow('Unauthorized')

      // Try as WORKER - should also fail
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '98', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(updateTransaction('tx-1', { amount: 200 })).rejects.toThrow('Unauthorized')

      // Try as GUEST for delete
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '99', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(deleteTransaction('tx-1')).rejects.toThrow('Unauthorized')
    })

    it('should allow ACCOUNTANT full access to finance operations', async () => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '2', email: 'accountant@test.com', name: 'Accountant', role: 'ACCOUNTANT' },
        })
      )

      const mockTransaction = {
        id: 'tx-accountant',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(100),
        date: new Date(),
        description: null,
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Create
      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)
      const createResult = await createExpense({
        categoryId: 'cat-1',
        amount: 100,
        date: new Date(),
      })
      expect(createResult.success).toBe(true)

      // Update
      prismaMock.transaction.update.mockResolvedValueOnce({
        ...mockTransaction,
        amount: mockDecimal(150),
      })
      const updateResult = await updateTransaction('tx-accountant', { amount: 150 })
      expect(updateResult.success).toBe(true)

      // Add receipt
      prismaMock.receipt.create.mockResolvedValueOnce({
        id: 'receipt-accountant',
        transactionId: 'tx-accountant',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })
      const receiptResult = await addReceiptToTransaction('tx-accountant', {
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
      })
      expect(receiptResult.success).toBe(true)

      // Delete receipt
      prismaMock.receipt.findUnique.mockResolvedValueOnce({
        id: 'receipt-accountant',
        transactionId: 'tx-accountant',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })
      prismaMock.receipt.delete.mockResolvedValueOnce({
        id: 'receipt-accountant',
        transactionId: 'tx-accountant',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })
      const deleteReceiptResult = await deleteReceipt('receipt-accountant')
      expect(deleteReceiptResult.success).toBe(true)

      // Delete transaction
      prismaMock.receipt.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.delete.mockResolvedValueOnce(mockTransaction)
      const deleteResult = await deleteTransaction('tx-accountant')
      expect(deleteResult.success).toBe(true)
    })
  })
})
