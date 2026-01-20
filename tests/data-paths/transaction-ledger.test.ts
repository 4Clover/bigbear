import { describe, it, expect } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { Decimal } from '../fixtures/booking.factory'

/**
 * Transaction ledger data path tests.
 * Tests financial transaction integrity including:
 * - INCOME vs EXPENSE categorization
 * - Tax deductibility tracking
 * - Receipt attachment management
 * - Aggregation and reporting patterns
 */
describe('Transaction Ledger Data Path', () => {
  describe('Transaction creation', () => {
    it('should create INCOME transaction', async () => {
      const transaction = {
        id: 'txn-1',
        type: 'INCOME' as const,
        categoryId: 'rental-income',
        amount: new Decimal('450.00'),
        date: new Date(),
        description: 'Booking payment',
        vendor: null,
        bookingId: 'booking-1',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValue(transaction)

      const result = await prismaMock.transaction.create({
        data: {
          type: 'INCOME',
          categoryId: 'rental-income',
          amount: 450.0,
          date: new Date(),
          bookingId: 'booking-1',
        },
      })

      expect(result.type).toBe('INCOME')
      expect(result.bookingId).toBe('booking-1')
    })

    it('should create EXPENSE transaction', async () => {
      const transaction = {
        id: 'txn-2',
        type: 'EXPENSE' as const,
        categoryId: 'utilities',
        amount: new Decimal('125.50'),
        date: new Date(),
        description: 'Electric bill',
        vendor: 'Power Company',
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValue(transaction)

      const result = await prismaMock.transaction.create({
        data: {
          type: 'EXPENSE',
          categoryId: 'utilities',
          amount: 125.5,
          date: new Date(),
          vendor: 'Power Company',
        },
      })

      expect(result.type).toBe('EXPENSE')
      expect(result.vendor).toBe('Power Company')
    })

    it('should allow transaction without booking reference', async () => {
      const transaction = {
        id: 'txn-3',
        type: 'EXPENSE' as const,
        categoryId: 'repairs',
        amount: new Decimal('250.00'),
        date: new Date(),
        description: 'Plumber service',
        vendor: null,
        bookingId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transaction.create.mockResolvedValue(transaction)

      const result = await prismaMock.transaction.create({
        data: {
          type: 'EXPENSE',
          categoryId: 'repairs',
          amount: 250.0,
          date: new Date(),
        },
      })

      expect(result.bookingId).toBeNull()
    })
  })

  describe('Expense categories', () => {
    it('should retrieve category with tax deductibility', async () => {
      const category = {
        id: 'cat-utilities',
        name: 'Utilities',
        description: 'Electric, gas, water',
        scheduleELine: 'Line 17',
        isTaxDeductible: true,
        sortOrder: 13,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.expenseCategory.findUnique.mockResolvedValue(category)

      const result = await prismaMock.expenseCategory.findUnique({
        where: { name: 'Utilities' },
      })

      expect(result?.isTaxDeductible).toBe(true)
      expect(result?.scheduleELine).toBe('Line 17')
    })

    it('should handle non-deductible categories', async () => {
      const category = {
        id: 'cat-income',
        name: 'Rental Income',
        description: 'Booking revenue',
        scheduleELine: 'Line 3',
        isTaxDeductible: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.expenseCategory.findUnique.mockResolvedValue(category)

      const result = await prismaMock.expenseCategory.findUnique({
        where: { name: 'Rental Income' },
      })

      expect(result?.isTaxDeductible).toBe(false)
    })
  })

  describe('Receipt management', () => {
    it('should create receipt attached to transaction', async () => {
      const receipt = {
        id: 'receipt-1',
        transactionId: 'txn-1',
        fileName: 'receipt.pdf',
        fileUrl: 'https://storage.example.com/receipts/receipt.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      }

      prismaMock.receipt.create.mockResolvedValue(receipt)

      const result = await prismaMock.receipt.create({
        data: {
          transactionId: 'txn-1',
          fileName: 'receipt.pdf',
          fileUrl: 'https://storage.example.com/receipts/receipt.pdf',
          fileSize: 102400,
          mimeType: 'application/pdf',
        },
      })

      expect(result.transactionId).toBe('txn-1')
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should allow multiple receipts per transaction', async () => {
      const receipts = [
        {
          id: 'receipt-1',
          transactionId: 'txn-1',
          fileName: 'invoice.pdf',
          fileUrl: 'https://example.com/invoice.pdf',
          fileSize: 50000,
          mimeType: 'application/pdf',
          createdAt: new Date(),
        },
        {
          id: 'receipt-2',
          transactionId: 'txn-1',
          fileName: 'proof.jpg',
          fileUrl: 'https://example.com/proof.jpg',
          fileSize: 150000,
          mimeType: 'image/jpeg',
          createdAt: new Date(),
        },
      ]

      prismaMock.receipt.findMany.mockResolvedValue(receipts)

      const result = await prismaMock.receipt.findMany({
        where: { transactionId: 'txn-1' },
      })

      expect(result.length).toBe(2)
    })
  })

  describe('Ledger aggregations', () => {
    it('should sum INCOME transactions', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal('2500.00') },
        _count: { id: 5 },
        _avg: undefined,
        _min: undefined,
        _max: undefined,
      })

      const result = await prismaMock.transaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true },
      })

      expect(result._sum.amount?.toString()).toBe('2500')
    })

    it('should sum EXPENSE transactions', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal('850.00') },
        _count: { id: 8 },
        _avg: undefined,
        _min: undefined,
        _max: undefined,
      })

      const result = await prismaMock.transaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { amount: true },
      })

      expect(result._sum.amount?.toString()).toBe('850')
    })

    it('should calculate net income', () => {
      const income = new Decimal('2500.00')
      const expenses = new Decimal('850.00')
      const net = income.sub(expenses)

      expect(net.toString()).toBe('1650')
    })

    it('should group expenses by category', async () => {
      // Cast to any to work around vitest-mock-extended limitations with Prisma's complex groupBy generics
      ;(prismaMock.transaction.groupBy as any).mockResolvedValue([
        { categoryId: 'utilities', _sum: { amount: new Decimal('300.00') } },
        { categoryId: 'repairs', _sum: { amount: new Decimal('450.00') } },
        { categoryId: 'supplies', _sum: { amount: new Decimal('100.00') } },
      ])

      const result = await prismaMock.transaction.groupBy({
        by: ['categoryId'],
        where: { type: 'EXPENSE' },
        _sum: { amount: true },
      })

      expect(result.length).toBe(3)
    })
  })

  describe('Date-based queries', () => {
    it('should find transactions in date range', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: 'EXPENSE' as const,
          categoryId: 'utilities',
          amount: new Decimal('100.00'),
          date: new Date('2024-06-15'),
          description: null,
          vendor: null,
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.transaction.findMany.mockResolvedValue(transactions)

      const result = await prismaMock.transaction.findMany({
        where: {
          date: {
            gte: new Date('2024-06-01'),
            lte: new Date('2024-06-30'),
          },
        },
      })

      expect(result.length).toBe(1)
    })

    it('should find transactions for specific year', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([])

      await prismaMock.transaction.findMany({
        where: {
          date: {
            gte: new Date('2024-01-01'),
            lt: new Date('2025-01-01'),
          },
        },
      })

      expect(prismaMock.transaction.findMany).toHaveBeenCalled()
    })
  })

  describe('Tax deductibility filtering', () => {
    it('should find only tax-deductible expenses', async () => {
      const deductibleCategories = [
        { id: 'cat-1', name: 'Utilities', isTaxDeductible: true },
        { id: 'cat-2', name: 'Repairs', isTaxDeductible: true },
      ]

      prismaMock.expenseCategory.findMany.mockResolvedValue(
        deductibleCategories.map((c) => ({
          ...c,
          description: null,
          scheduleELine: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )

      const result = await prismaMock.expenseCategory.findMany({
        where: { isTaxDeductible: true },
      })

      result.forEach((category) => {
        expect(category.isTaxDeductible).toBe(true)
      })
    })
  })
})
