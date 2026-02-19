import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../__mocks__/prisma'
import { mockAuth, createMockSession } from '../../__mocks__/auth'

// Prisma client extension now converts Decimals to plain numbers
const mockDecimal = (value: number) => value

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

import {
  createExpense,
  updateTransaction,
  deleteTransaction,
  addReceiptToTransaction,
  deleteReceipt,
  getTransactions,
  getFinanceSummary,
  getExpenseCategories,
} from '@/actions/finance'

describe('Finance Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    ;(prismaMock.$transaction as any).mockImplementation(async (fnOrArray: unknown) => {
      if (typeof fnOrArray === 'function') {
        return (fnOrArray as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock)
      }
      return Promise.all(fnOrArray as Promise<unknown>[])
    })
  })

  // =============================================================================
  // AUTHORIZATION TESTS
  // =============================================================================
  describe('Authorization', () => {
    it('should allow OWNER to create expenses', async () => {
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
        description: 'Test expense',
        vendor: 'Test Vendor',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 100,
        date: new Date(),
        description: 'Test expense',
        vendor: 'Test Vendor',
      })

      expect(result.success).toBe(true)
      expect(result.transaction).toBeDefined()
    })

    it('should allow ACCOUNTANT to create expenses', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'accountant@test.com', name: 'Accountant', role: 'ACCOUNTANT' },
        })
      )

      const mockTransaction = {
        id: 'tx-2',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(50),
        date: new Date(),
        description: null,
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 50,
        date: new Date(),
      })

      expect(result.success).toBe(true)
    })

    it('should reject GUEST from creating expenses', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(
        createExpense({
          categoryId: 'cat-1',
          amount: 100,
          date: new Date(),
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should reject WORKER from creating expenses', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '4', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(
        createExpense({
          categoryId: 'cat-1',
          amount: 100,
          date: new Date(),
        })
      ).rejects.toThrow('Unauthorized')
    })

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

    it('should allow OWNER to update transactions', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(200),
        date: new Date(),
        description: 'Updated',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      const result = await updateTransaction('tx-1', { amount: 200 })
      expect(result.success).toBe(true)
    })

    it('should allow ACCOUNTANT to update transactions', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'accountant@test.com', name: 'Accountant', role: 'ACCOUNTANT' },
        })
      )

      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(200),
        date: new Date(),
        description: 'Updated',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      const result = await updateTransaction('tx-1', { amount: 200 })
      expect(result.success).toBe(true)
    })

    it('should reject GUEST from updating transactions', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(updateTransaction('tx-1', { amount: 200 })).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // createExpense TESTS
  // =============================================================================
  describe('createExpense', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should create expense without receipts', async () => {
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(100),
        date: new Date(),
        description: 'No receipts',
        vendor: 'Vendor',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 100,
        date: new Date(),
        description: 'No receipts',
        vendor: 'Vendor',
      })

      expect(result.success).toBe(true)
      expect(result.transaction).toEqual(mockTransaction)
      expect(prismaMock.receipt.create).not.toHaveBeenCalled()
    })

    it('should create expense with single receipt', async () => {
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(150),
        date: new Date(),
        description: 'Office supplies',
        vendor: 'Staples',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)
      prismaMock.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 150,
        date: new Date(),
        description: 'Office supplies',
        vendor: 'Staples',
        receiptUrls: ['https://blob.test/receipt.pdf'],
      })

      expect(result.success).toBe(true)
      expect(prismaMock.receipt.create).toHaveBeenCalledOnce()
      expect(prismaMock.receipt.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt.pdf',
          fileName: 'receipt.pdf',
        },
      })
    })

    it('should create expense with multiple receipts', async () => {
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(500),
        date: new Date(),
        description: 'Multiple receipts',
        vendor: 'Multiple Vendors',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)
      prismaMock.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt1.pdf',
        fileName: 'receipt1.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })

      const result = await createExpense({
        categoryId: 'cat-1',
        amount: 500,
        date: new Date(),
        description: 'Multiple receipts',
        vendor: 'Multiple Vendors',
        receiptUrls: [
          'https://blob.test/receipt1.pdf',
          'https://blob.test/receipt2.jpg',
          'https://blob.test/receipt3.png',
        ],
      })

      expect(result.success).toBe(true)
      expect(prismaMock.receipt.create).toHaveBeenCalledTimes(3)
    })

    it('should call revalidatePath after creating expense', async () => {
      const mockTransaction = {
        id: 'tx-1',
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

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)

      await createExpense({
        categoryId: 'cat-1',
        amount: 100,
        date: new Date(),
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should rollback transaction creation if receipt creation fails', async () => {
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(100),
        date: new Date(),
        description: 'Rollback test',
        vendor: 'Test Vendor',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValueOnce(mockTransaction)
      prismaMock.receipt.create.mockRejectedValueOnce(new Error('DB error'))

      await expect(
        createExpense({
          categoryId: 'cat-1',
          amount: 100,
          date: new Date(),
          description: 'Rollback test',
          vendor: 'Test Vendor',
          receiptUrls: ['https://blob.test/receipt.pdf'],
        })
      ).rejects.toThrow('DB error')

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // =============================================================================
  // updateTransaction TESTS
  // =============================================================================
  describe('updateTransaction', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should update single field', async () => {
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-1',
        amount: mockDecimal(200),
        date: new Date(),
        description: null,
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      const result = await updateTransaction('tx-1', { amount: 200 })

      expect(result.success).toBe(true)
      expect(result.transaction).toEqual(mockTransaction)
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { amount: 200 },
      })
    })

    it('should update multiple fields', async () => {
      const newDate = new Date('2024-06-15')
      const mockTransaction = {
        id: 'tx-1',
        type: 'EXPENSE' as const,
        categoryId: 'cat-2',
        amount: mockDecimal(300),
        date: newDate,
        description: 'Updated description',
        vendor: 'New Vendor',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      const result = await updateTransaction('tx-1', {
        categoryId: 'cat-2',
        amount: 300,
        date: newDate,
        description: 'Updated description',
        vendor: 'New Vendor',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: {
          categoryId: 'cat-2',
          amount: 300,
          date: newDate,
          description: 'Updated description',
          vendor: 'New Vendor',
        },
      })
    })

    it('should call revalidatePath after updating', async () => {
      const mockTransaction = {
        id: 'tx-1',
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

      prismaMock.transaction.update.mockResolvedValueOnce(mockTransaction)

      await updateTransaction('tx-1', { amount: 100 })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })
  })

  // =============================================================================
  // deleteTransaction TESTS
  // =============================================================================
  describe('deleteTransaction', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
      prismaMock.receipt.deleteMany.mockResolvedValue({ count: 0 })
    })

    it('should delete transaction with associated receipts', async () => {
      prismaMock.receipt.findMany.mockResolvedValueOnce([
        {
          id: 'receipt-1',
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt1.pdf',
          fileName: 'receipt1.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
        {
          id: 'receipt-2',
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt2.jpg',
          fileName: 'receipt2.jpg',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
      ])

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
      expect(prismaMock.receipt.findMany).toHaveBeenCalledWith({
        where: { transactionId: 'tx-1' },
      })
      expect(mockDeleteBlob).toHaveBeenCalledTimes(2)
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/receipt1.pdf')
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/receipt2.jpg')
    })

    it('should delete transaction with no receipts', async () => {
      prismaMock.receipt.findMany.mockResolvedValueOnce([])

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
      expect(mockDeleteBlob).not.toHaveBeenCalled()
    })

    it('should continue deleting even if blob deletion fails', async () => {
      prismaMock.receipt.findMany.mockResolvedValueOnce([
        {
          id: 'receipt-1',
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt1.pdf',
          fileName: 'receipt1.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        },
      ])

      mockDeleteBlob.mockRejectedValueOnce(new Error('Blob not found'))

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
      expect(prismaMock.transaction.delete).toHaveBeenCalled()
    })

    it('should call revalidatePath after deleting', async () => {
      prismaMock.receipt.findMany.mockResolvedValueOnce([])
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

      await deleteTransaction('tx-1')

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should rollback if transaction deletion fails in $transaction', async () => {
      prismaMock.receipt.findMany.mockResolvedValueOnce([])
      prismaMock.receipt.deleteMany.mockResolvedValueOnce({ count: 0 })
      prismaMock.transaction.delete.mockRejectedValueOnce(new Error('FK constraint'))

      await expect(deleteTransaction('tx-1')).rejects.toThrow('FK constraint')
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // =============================================================================
  // addReceiptToTransaction TESTS
  // =============================================================================
  describe('addReceiptToTransaction', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should add receipt with all fields', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      }

      prismaMock.receipt.create.mockResolvedValueOnce(mockReceipt)

      const result = await addReceiptToTransaction('tx-1', {
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      })

      expect(result.success).toBe(true)
      expect(result.receipt).toEqual(mockReceipt)
      expect(prismaMock.receipt.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt.pdf',
          fileName: 'receipt.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      })
    })

    it('should add receipt with minimal fields', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.jpg',
        fileName: 'photo.jpg',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      }

      prismaMock.receipt.create.mockResolvedValueOnce(mockReceipt)

      const result = await addReceiptToTransaction('tx-1', {
        fileUrl: 'https://blob.test/receipt.jpg',
        fileName: 'photo.jpg',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.receipt.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-1',
          fileUrl: 'https://blob.test/receipt.jpg',
          fileName: 'photo.jpg',
          fileSize: undefined,
          mimeType: undefined,
        },
      })
    })

    it('should call revalidatePath after adding receipt', async () => {
      prismaMock.receipt.create.mockResolvedValueOnce({
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      })

      await addReceiptToTransaction('tx-1', {
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should reject unauthorized users', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(
        addReceiptToTransaction('tx-1', {
          fileUrl: 'https://blob.test/receipt.pdf',
          fileName: 'receipt.pdf',
        })
      ).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // deleteReceipt TESTS
  // =============================================================================
  describe('deleteReceipt', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should delete existing receipt and its blob', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      }

      prismaMock.receipt.findUnique.mockResolvedValueOnce(mockReceipt)
      prismaMock.receipt.delete.mockResolvedValueOnce(mockReceipt)

      const result = await deleteReceipt('receipt-1')

      expect(result.success).toBe(true)
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.test/receipt.pdf')
      expect(prismaMock.receipt.delete).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
      })
    })

    it('should throw error when receipt not found', async () => {
      prismaMock.receipt.findUnique.mockResolvedValueOnce(null)

      await expect(deleteReceipt('non-existent')).rejects.toThrow('Receipt not found')
      expect(mockDeleteBlob).not.toHaveBeenCalled()
      expect(prismaMock.receipt.delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if blob deletion fails', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      }

      prismaMock.receipt.findUnique.mockResolvedValueOnce(mockReceipt)
      mockDeleteBlob.mockRejectedValueOnce(new Error('Blob not found'))
      prismaMock.receipt.delete.mockResolvedValueOnce(mockReceipt)

      const result = await deleteReceipt('receipt-1')

      expect(result.success).toBe(true)
      expect(prismaMock.receipt.delete).toHaveBeenCalled()
    })

    it('should call revalidatePath after deleting receipt', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        transactionId: 'tx-1',
        fileUrl: 'https://blob.test/receipt.pdf',
        fileName: 'receipt.pdf',
        fileSize: null,
        mimeType: null,
        createdAt: new Date(),
      }

      prismaMock.receipt.findUnique.mockResolvedValueOnce(mockReceipt)
      prismaMock.receipt.delete.mockResolvedValueOnce(mockReceipt)

      await deleteReceipt('receipt-1')

      expect(mockRevalidatePath).toHaveBeenCalledWith('/owner/finance')
    })

    it('should reject unauthorized users', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(deleteReceipt('receipt-1')).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // getTransactions TESTS
  // =============================================================================
  describe('getTransactions', () => {
    it('should return all transactions without filters', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions()

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        include: { category: true, receipts: true },
        orderBy: { date: 'desc' },
        take: 25,
        skip: 0,
      })
    })

    it('should filter by type', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ type: 'EXPENSE' })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'EXPENSE' }),
        })
      )
    })

    it('should filter by category', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ categoryId: 'cat-1' })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        })
      )
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ startDate, endDate })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: startDate, lte: endDate },
          }),
        })
      )
    })

    it('should filter by start date only', async () => {
      const startDate = new Date('2024-01-01')

      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ startDate })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: startDate },
          }),
        })
      )
    })

    it('should filter by end date only', async () => {
      const endDate = new Date('2024-12-31')

      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ endDate })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { lte: endDate },
          }),
        })
      )
    })

    it('should search by description or vendor', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({ search: 'office' })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { description: { contains: 'office', mode: 'insensitive' } },
              { vendor: { contains: 'office', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })

    it('should combine multiple filters', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      prismaMock.transaction.findMany.mockResolvedValueOnce([])
      prismaMock.transaction.count.mockResolvedValueOnce(0)

      await getTransactions({
        type: 'EXPENSE',
        categoryId: 'cat-1',
        startDate,
        endDate,
        search: 'supplies',
      })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          type: 'EXPENSE',
          categoryId: 'cat-1',
          date: { gte: startDate, lte: endDate },
          OR: [
            { description: { contains: 'supplies', mode: 'insensitive' } },
            { vendor: { contains: 'supplies', mode: 'insensitive' } },
          ],
        },
        include: { category: true, receipts: true },
        orderBy: { date: 'desc' },
        take: 25,
        skip: 0,
      })
    })
  })

  // =============================================================================
  // getFinanceSummary TESTS
  // =============================================================================
  describe('getFinanceSummary', () => {
    // Prisma groupBy has deeply nested conditional types that vitest-mock-extended cannot resolve
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const groupByMock = (prismaMock.transaction as any).groupBy as ReturnType<typeof vi.fn>

    const mockSummaryAggregates = (
      income: number | null,
      expense: number | null,
      count: number
    ) => {
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: income },
      } as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: expense },
      } as never)
      prismaMock.transaction.count.mockResolvedValueOnce(count)
    }

    it('should calculate income, expenses, and net income for full year', async () => {
      mockSummaryAggregates(1000, 300, 2)
      groupByMock.mockResolvedValueOnce([
        { categoryId: 'cat-1', type: 'INCOME', _sum: { amount: 1000 } },
        { categoryId: 'cat-1', type: 'EXPENSE', _sum: { amount: 300 } },
      ])
      prismaMock.expenseCategory.findMany.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Utilities' },
      ] as never)

      const result = await getFinanceSummary(2024)

      expect(result.income).toBe(1000)
      expect(result.expenses).toBe(300)
      expect(result.netIncome).toBe(700)
      expect(result.transactionCount).toBe(2)
    })

    it('should calculate summary for specific month', async () => {
      mockSummaryAggregates(500, null, 1)
      groupByMock.mockResolvedValueOnce([
        { categoryId: 'cat-1', type: 'INCOME', _sum: { amount: 500 } },
      ])
      prismaMock.expenseCategory.findMany.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Rental Income' },
      ] as never)

      const result = await getFinanceSummary(2024, 6)

      expect(result.income).toBe(500)
      expect(result.expenses).toBe(0)
      expect(result.netIncome).toBe(500)
      expect(result.transactionCount).toBe(1)
    })

    it('should calculate byCategory breakdown', async () => {
      mockSummaryAggregates(2000, 200, 3)
      groupByMock.mockResolvedValueOnce([
        { categoryId: 'cat-2', type: 'INCOME', _sum: { amount: 2000 } },
        { categoryId: 'cat-1', type: 'EXPENSE', _sum: { amount: 200 } },
      ])
      prismaMock.expenseCategory.findMany.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Utilities' },
        { id: 'cat-2', name: 'Rental Income' },
      ] as never)

      const result = await getFinanceSummary(2024)

      expect(result.income).toBe(2000)
      expect(result.expenses).toBe(200)
      expect(result.netIncome).toBe(1800)
      expect(result.byCategory).toEqual({
        'Rental Income': 2000,
        Utilities: -200,
      })
    })

    it('should handle empty transactions', async () => {
      mockSummaryAggregates(null, null, 0)
      groupByMock.mockResolvedValueOnce([])

      const result = await getFinanceSummary(2024)

      expect(result.income).toBe(0)
      expect(result.expenses).toBe(0)
      expect(result.netIncome).toBe(0)
      expect(result.byCategory).toEqual({})
      expect(result.transactionCount).toBe(0)
    })

    it('should use correct date range for yearly query', async () => {
      mockSummaryAggregates(null, null, 0)
      groupByMock.mockResolvedValueOnce([])

      await getFinanceSummary(2024)

      const expectedDateFilter = {
        gte: new Date(2024, 0, 1),
        lte: new Date(2024, 11, 31),
      }

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { date: expectedDateFilter, type: 'INCOME' },
        _sum: { amount: true },
      })
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { date: expectedDateFilter, type: 'EXPENSE' },
        _sum: { amount: true },
      })
    })

    it('should use correct date range for monthly query', async () => {
      mockSummaryAggregates(null, null, 0)
      groupByMock.mockResolvedValueOnce([])

      await getFinanceSummary(2024, 6)

      const expectedDateFilter = {
        gte: new Date(2024, 5, 1),
        lte: new Date(2024, 6, 0),
      }

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { date: expectedDateFilter, type: 'INCOME' },
        _sum: { amount: true },
      })
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { date: expectedDateFilter, type: 'EXPENSE' },
        _sum: { amount: true },
      })
    })
  })

  // =============================================================================
  // getExpenseCategories TESTS
  // =============================================================================
  describe('getExpenseCategories', () => {
    it('should return categories sorted by sortOrder', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Utilities',
          description: null,
          scheduleELine: '16',
          isTaxDeductible: true,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          name: 'Repairs',
          description: null,
          scheduleELine: '14',
          isTaxDeductible: true,
          sortOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.expenseCategory.findMany.mockResolvedValueOnce(mockCategories)

      const result = await getExpenseCategories()

      expect(result).toHaveLength(2)
      expect(prismaMock.expenseCategory.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
        take: 100,
      })
    })

    it('should return empty array when no categories exist', async () => {
      prismaMock.expenseCategory.findMany.mockResolvedValueOnce([])

      const result = await getExpenseCategories()

      expect(result).toEqual([])
    })
  })
})
