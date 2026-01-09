import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../__mocks__/prisma'
import { mockAuth, createMockSession } from '../../__mocks__/auth'

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  generateMonthlyReport,
  generateAnnualReport,
  generateScheduleEReport,
  exportReportToCsv,
} from '@/actions/reports'

// Prisma client extension now converts Decimals to plain numbers
const mockDecimal = (value: number) => value

const createMockTransaction = (overrides: Partial<{
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  date: Date
  description: string
  vendor: string
  categoryId: string
  category: { id: string; name: string; scheduleELine: string | null; isTaxDeductible: boolean }
  receipts: unknown[]
}> = {}) => ({
  id: overrides.id ?? 'tx-1',
  type: overrides.type ?? 'EXPENSE',
  amount: mockDecimal(overrides.amount ?? 100),
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

describe('Report Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(
      createMockSession({
        user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
      })
    )
  })

  describe('generateMonthlyReport', () => {
    it('should generate monthly report with income and expenses', async () => {
      const transactions = [
        createMockTransaction({
          id: 'tx-1',
          type: 'INCOME',
          amount: 1000,
          category: { id: 'cat-rent', name: 'Rental Income', scheduleELine: 'Line 3', isTaxDeductible: false },
        }),
        createMockTransaction({
          id: 'tx-2',
          type: 'EXPENSE',
          amount: 200,
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
        createMockTransaction({
          id: 'tx-3',
          type: 'EXPENSE',
          amount: 150,
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const result = await generateMonthlyReport(2024, 6)

      expect(result.period).toBe('June 2024')
      expect(result.income).toBe(1000)
      expect(result.expenses).toBe(350)
      expect(result.netIncome).toBe(650)
      expect(result.byCategory.Utilities?.expenses).toBe(350)
      expect(result.byCategory['Rental Income']?.income).toBe(1000)
    })

    it('should reject unauthorized users', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(generateMonthlyReport(2024, 6)).rejects.toThrow('Unauthorized')
    })

    it('should allow ACCOUNTANT role', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'accountant@test.com', name: 'Accountant', role: 'ACCOUNTANT' },
        })
      )

      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      const result = await generateMonthlyReport(2024, 6)
      expect(result.income).toBe(0)
      expect(result.expenses).toBe(0)
    })
  })

  describe('generateAnnualReport', () => {
    it('should generate annual report with monthly breakdown', async () => {
      const transactions = [
        createMockTransaction({
          type: 'INCOME',
          amount: 2000,
          date: new Date('2024-01-15'),
          category: { id: 'cat-rent', name: 'Rental Income', scheduleELine: 'Line 3', isTaxDeductible: false },
        }),
        createMockTransaction({
          type: 'EXPENSE',
          amount: 500,
          date: new Date('2024-01-20'),
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
      ]

      // Main annual query
      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      // Monthly breakdown queries (12 months)
      for (let i = 0; i < 12; i++) {
        prismaMock.transaction.findMany.mockResolvedValueOnce(
          i === 0 ? transactions as never : []
        )
      }

      const result = await generateAnnualReport(2024)

      expect(result.year).toBe(2024)
      expect(result.totalIncome).toBe(2000)
      expect(result.totalExpenses).toBe(500)
      expect(result.netIncome).toBe(1500)
      expect(result.monthlyBreakdown).toHaveLength(12)
      expect(result.monthlyBreakdown[0]?.income).toBe(2000)
    })

    it('should group tax-deductible expenses by Schedule E line', async () => {
      const transactions = [
        createMockTransaction({
          type: 'EXPENSE',
          amount: 300,
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
        createMockTransaction({
          type: 'EXPENSE',
          amount: 200,
          category: { id: 'cat-repairs', name: 'Repairs', scheduleELine: 'Line 14', isTaxDeductible: true },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)
      for (let i = 0; i < 12; i++) {
        prismaMock.transaction.findMany.mockResolvedValueOnce([])
      }

      const result = await generateAnnualReport(2024)

      expect(result.scheduleE['Line 17']?.amount).toBe(300)
      expect(result.scheduleE['Line 14']?.amount).toBe(200)
    })
  })

  describe('generateScheduleEReport', () => {
    it('should generate Schedule E report with line items', async () => {
      const expenseTransactions = [
        createMockTransaction({
          type: 'EXPENSE',
          amount: 400,
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
        createMockTransaction({
          type: 'EXPENSE',
          amount: 300,
          category: { id: 'cat-repairs', name: 'Repairs', scheduleELine: 'Line 14', isTaxDeductible: true },
        }),
        createMockTransaction({
          type: 'EXPENSE',
          amount: 100,
          category: { id: 'cat-hoa', name: 'HOA Fees', scheduleELine: 'Line 19', isTaxDeductible: true },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(expenseTransactions as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: mockDecimal(5000) },
      } as never)

      const result = await generateScheduleEReport(2024)

      expect(result.year).toBe(2024)
      expect(result.rentalIncome).toBe(5000)
      expect(result.totalExpenses).toBe(800)
      expect(result.lineItems).toHaveLength(3)

      const line17 = result.lineItems.find((l) => l.line === 'Line 17')
      expect(line17?.total).toBe(400)
      expect(line17?.categories).toContain('Utilities')
    })

    it('should sort line items by line number', async () => {
      const expenseTransactions = [
        createMockTransaction({
          category: { id: 'cat-1', name: 'HOA', scheduleELine: 'Line 19', isTaxDeductible: true },
        }),
        createMockTransaction({
          category: { id: 'cat-2', name: 'Advertising', scheduleELine: 'Line 5', isTaxDeductible: true },
        }),
        createMockTransaction({
          category: { id: 'cat-3', name: 'Repairs', scheduleELine: 'Line 14', isTaxDeductible: true },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(expenseTransactions as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: mockDecimal(0) },
      } as never)

      const result = await generateScheduleEReport(2024)

      expect(result.lineItems[0]?.line).toBe('Line 5')
      expect(result.lineItems[1]?.line).toBe('Line 14')
      expect(result.lineItems[2]?.line).toBe('Line 19')
    })
  })

  describe('exportReportToCsv', () => {
    it('should export transactions to CSV format', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-06-15'),
          type: 'EXPENSE',
          amount: 100,
          description: 'Electric bill',
          vendor: 'Power Company',
          category: { id: 'cat-util', name: 'Utilities', scheduleELine: 'Line 17', isTaxDeductible: true },
        }),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const csv = await exportReportToCsv(2024, 6)

      expect(csv).toContain('"Date","Type","Category","Description","Vendor","Amount"')
      expect(csv).toContain('"EXPENSE"')
      expect(csv).toContain('"Utilities"')
      expect(csv).toContain('"Electric bill"')
      expect(csv).toContain('"Power Company"')
      expect(csv).toContain('"100.00"')
      // Date may vary by timezone, just verify format
      expect(csv).toMatch(/"2024-06-\d{2}"/)
    })

    it('should handle null description and vendor', async () => {
      const transactions = [
        {
          ...createMockTransaction(),
          description: null,
          vendor: null,
        },
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const csv = await exportReportToCsv(2024)

      expect(csv).toContain('""') // Empty strings for null values
    })

    it('should export yearly data when month is not provided', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      await exportReportToCsv(2024)

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date(2024, 0, 1),
              lte: new Date(2024, 11, 31),
            },
          },
        })
      )
    })
  })
})
