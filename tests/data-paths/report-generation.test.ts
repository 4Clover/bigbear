import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { mockAuth, createMockSession } from '../__mocks__/auth'

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  generateMonthlyReport,
  generateAnnualReport,
  generateScheduleEReport,
  exportReportToCsv,
} from '@/actions/reports'

const mockDecimal = (value: number) =>
  ({
    toNumber: () => value,
    toString: () => value.toString(),
    valueOf: () => value,
  }) as never

const createMockCategory = (overrides: {
  id: string
  name: string
  scheduleELine?: string
  isTaxDeductible?: boolean
}) => ({
  id: overrides.id,
  name: overrides.name,
  description: null,
  scheduleELine: overrides.scheduleELine ?? null,
  isTaxDeductible: overrides.isTaxDeductible ?? true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const createMockTransaction = (
  id: string,
  type: 'INCOME' | 'EXPENSE',
  amount: number,
  date: Date,
  category: ReturnType<typeof createMockCategory>,
  description?: string,
  vendor?: string
) => ({
  id,
  type,
  amount: mockDecimal(amount),
  date,
  description: description ?? null,
  vendor: vendor ?? null,
  categoryId: category.id,
  bookingId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category,
  receipts: [],
})

describe('Report Generation Data Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(
      createMockSession({
        user: { id: 'owner-1', email: 'owner@bigbear.com', name: 'Property Owner', role: 'OWNER' },
      })
    )
  })

  describe('Complete Monthly Report Workflow', () => {
    it('should accurately aggregate multiple income and expense transactions', async () => {
      const rentalCategory = createMockCategory({
        id: 'cat-rental',
        name: 'Rental Income',
        scheduleELine: 'Line 3',
        isTaxDeductible: false,
      })
      const utilitiesCategory = createMockCategory({
        id: 'cat-utilities',
        name: 'Utilities',
        scheduleELine: 'Line 17',
      })
      const repairsCategory = createMockCategory({
        id: 'cat-repairs',
        name: 'Repairs',
        scheduleELine: 'Line 14',
      })

      const transactions = [
        createMockTransaction('tx-1', 'INCOME', 1500, new Date('2024-06-01'), rentalCategory, 'June rental'),
        createMockTransaction('tx-2', 'INCOME', 1500, new Date('2024-06-15'), rentalCategory, 'Mid-month rental'),
        createMockTransaction('tx-3', 'EXPENSE', 200, new Date('2024-06-05'), utilitiesCategory, 'Electric', 'Power Co'),
        createMockTransaction('tx-4', 'EXPENSE', 150, new Date('2024-06-10'), utilitiesCategory, 'Water', 'Water Dept'),
        createMockTransaction('tx-5', 'EXPENSE', 500, new Date('2024-06-20'), repairsCategory, 'Plumbing repair', 'Local Plumber'),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const report = await generateMonthlyReport(2024, 6)

      // Verify totals
      expect(report.income).toBe(3000)
      expect(report.expenses).toBe(850)
      expect(report.netIncome).toBe(2150)

      // Verify category breakdown
      expect(Object.keys(report.byCategory)).toHaveLength(3)
      expect(report.byCategory['Rental Income']?.income).toBe(3000)
      expect(report.byCategory['Rental Income']?.expenses).toBe(0)
      expect(report.byCategory['Utilities']?.income).toBe(0)
      expect(report.byCategory['Utilities']?.expenses).toBe(350)
      expect(report.byCategory['Repairs']?.expenses).toBe(500)

      // Verify transaction counts per category
      expect(report.byCategory['Rental Income']?.transactions).toHaveLength(2)
      expect(report.byCategory['Utilities']?.transactions).toHaveLength(2)
      expect(report.byCategory['Repairs']?.transactions).toHaveLength(1)
    })

    it('should handle months with no transactions', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      const report = await generateMonthlyReport(2024, 2)

      expect(report.period).toBe('February 2024')
      expect(report.income).toBe(0)
      expect(report.expenses).toBe(0)
      expect(report.netIncome).toBe(0)
      expect(Object.keys(report.byCategory)).toHaveLength(0)
    })
  })

  describe('Annual Report with Schedule E Integration', () => {
    it('should correctly group expenses by IRS Schedule E lines', async () => {
      const categories = {
        rental: createMockCategory({ id: 'rental', name: 'Rental Income', scheduleELine: 'Line 3', isTaxDeductible: false }),
        advertising: createMockCategory({ id: 'adv', name: 'Advertising', scheduleELine: 'Line 5' }),
        cleaning: createMockCategory({ id: 'clean', name: 'Cleaning', scheduleELine: 'Line 7' }),
        insurance: createMockCategory({ id: 'ins', name: 'Insurance', scheduleELine: 'Line 9' }),
        utilities: createMockCategory({ id: 'util', name: 'Utilities', scheduleELine: 'Line 17' }),
        hoa: createMockCategory({ id: 'hoa', name: 'HOA Fees', scheduleELine: 'Line 19' }),
      }

      const transactions = [
        createMockTransaction('tx-1', 'INCOME', 24000, new Date('2024-01-01'), categories.rental),
        createMockTransaction('tx-2', 'EXPENSE', 500, new Date('2024-03-01'), categories.advertising),
        createMockTransaction('tx-3', 'EXPENSE', 1200, new Date('2024-02-01'), categories.cleaning),
        createMockTransaction('tx-4', 'EXPENSE', 2400, new Date('2024-01-15'), categories.insurance),
        createMockTransaction('tx-5', 'EXPENSE', 3600, new Date('2024-06-01'), categories.utilities),
        createMockTransaction('tx-6', 'EXPENSE', 600, new Date('2024-04-01'), categories.hoa),
      ]

      // Main annual query
      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)
      // Monthly breakdown queries
      for (let i = 0; i < 12; i++) {
        prismaMock.transaction.findMany.mockResolvedValueOnce([])
      }

      const report = await generateAnnualReport(2024)

      // Verify Schedule E groupings
      expect(report.scheduleE['Line 5']?.amount).toBe(500)
      expect(report.scheduleE['Line 7']?.amount).toBe(1200)
      expect(report.scheduleE['Line 9']?.amount).toBe(2400)
      expect(report.scheduleE['Line 17']?.amount).toBe(3600)
      expect(report.scheduleE['Line 19']?.amount).toBe(600)

      // Rental income should NOT be in scheduleE (not tax deductible expense)
      expect(report.scheduleE['Line 3']).toBeUndefined()
    })

    it('should provide accurate 12-month breakdown', async () => {
      const category = createMockCategory({ id: 'rental', name: 'Rental Income', scheduleELine: 'Line 3', isTaxDeductible: false })

      // Main query returns all transactions
      prismaMock.transaction.findMany.mockResolvedValueOnce([])

      // Monthly queries - simulate varying income across months
      const monthlyIncomes = [1000, 1200, 1500, 1800, 2000, 2500, 2500, 2000, 1800, 1500, 1200, 1000]

      for (let month = 0; month < 12; month++) {
        const income = monthlyIncomes[month]
        if (income && income > 0) {
          prismaMock.transaction.findMany.mockResolvedValueOnce([
            createMockTransaction(`tx-${month}`, 'INCOME', income, new Date(2024, month, 15), category),
          ] as never)
        } else {
          prismaMock.transaction.findMany.mockResolvedValueOnce([])
        }
      }

      const report = await generateAnnualReport(2024)

      expect(report.monthlyBreakdown).toHaveLength(12)
      expect(report.monthlyBreakdown[0]?.month).toBe('Jan')
      expect(report.monthlyBreakdown[0]?.income).toBe(1000)
      expect(report.monthlyBreakdown[5]?.month).toBe('Jun')
      expect(report.monthlyBreakdown[5]?.income).toBe(2500)
      expect(report.monthlyBreakdown[11]?.month).toBe('Dec')
      expect(report.monthlyBreakdown[11]?.income).toBe(1000)
    })
  })

  describe('Schedule E Tax Report', () => {
    it('should match IRS Schedule E line structure', async () => {
      const categories = {
        utilities: createMockCategory({ id: 'util', name: 'Utilities', scheduleELine: 'Line 17' }),
        repairs: createMockCategory({ id: 'repair', name: 'Repairs', scheduleELine: 'Line 14' }),
        insurance: createMockCategory({ id: 'ins', name: 'Insurance', scheduleELine: 'Line 9' }),
        cleaning: createMockCategory({ id: 'clean', name: 'Cleaning & Maintenance', scheduleELine: 'Line 7' }),
      }

      const transactions = [
        createMockTransaction('tx-1', 'EXPENSE', 1000, new Date('2024-01-01'), categories.utilities),
        createMockTransaction('tx-2', 'EXPENSE', 500, new Date('2024-02-01'), categories.repairs),
        createMockTransaction('tx-3', 'EXPENSE', 1200, new Date('2024-03-01'), categories.insurance),
        createMockTransaction('tx-4', 'EXPENSE', 800, new Date('2024-04-01'), categories.cleaning),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: mockDecimal(12000) },
      } as never)

      const report = await generateScheduleEReport(2024)

      // Verify rental income (Line 3)
      expect(report.rentalIncome).toBe(12000)

      // Verify line items are sorted
      const lineNumbers = report.lineItems.map((l) => parseInt(l.line.replace('Line ', '')))
      expect(lineNumbers).toEqual([...lineNumbers].sort((a, b) => a - b))

      // Verify totals
      expect(report.totalExpenses).toBe(3500)

      // Net income = rental income - expenses
      const calculatedNet = report.rentalIncome - report.totalExpenses
      expect(calculatedNet).toBe(8500)
    })

    it('should handle categories without scheduleELine (defaults to Line 19)', async () => {
      const miscCategory = createMockCategory({
        id: 'misc',
        name: 'Miscellaneous',
        scheduleELine: undefined,
      })

      prismaMock.transaction.findMany.mockResolvedValueOnce([
        createMockTransaction('tx-1', 'EXPENSE', 100, new Date('2024-01-01'), {
          ...miscCategory,
          scheduleELine: null,
        }),
      ] as never)
      prismaMock.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: mockDecimal(0) },
      } as never)

      const report = await generateScheduleEReport(2024)

      expect(report.lineItems[0]?.line).toBe('Line 19')
      expect(report.lineItems[0]?.total).toBe(100)
    })
  })

  describe('CSV Export Data Integrity', () => {
    it('should export all required fields in correct format', async () => {
      const category = createMockCategory({ id: 'util', name: 'Utilities', scheduleELine: 'Line 17' })

      const transactions = [
        createMockTransaction('tx-1', 'EXPENSE', 150.75, new Date('2024-06-15'), category, 'Electric bill payment', 'City Power'),
        createMockTransaction('tx-2', 'INCOME', 2000.00, new Date('2024-06-01'), { ...category, name: 'Rental Income' }, 'June rent', 'Guest'),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const csv = await exportReportToCsv(2024, 6)
      const lines = csv.split('\n')

      // Verify header
      expect(lines[0]).toBe('"Date","Type","Category","Description","Vendor","Amount"')

      // Verify data rows (dates may vary by timezone, so check format only)
      expect(lines[1]).toMatch(/"2024-\d{2}-\d{2}"/)
      expect(lines[1]).toContain('"EXPENSE"')
      expect(lines[1]).toContain('"Utilities"')
      expect(lines[1]).toContain('"150.75"')

      expect(lines[2]).toMatch(/"2024-\d{2}-\d{2}"/)
      expect(lines[2]).toContain('"INCOME"')
      expect(lines[2]).toContain('"2000.00"')
    })

    it('should properly escape CSV special characters', async () => {
      const category = createMockCategory({ id: 'cat', name: 'Category, With Comma', scheduleELine: 'Line 17' })

      const transactions = [
        createMockTransaction('tx-1', 'EXPENSE', 100, new Date('2024-06-15'), category, 'Description with "quotes"', 'Vendor'),
      ]

      prismaMock.transaction.findMany.mockResolvedValueOnce(transactions as never)

      const csv = await exportReportToCsv(2024, 6)

      // Values should be wrapped in quotes
      expect(csv).toContain('"Category, With Comma"')
      expect(csv).toContain('"Description with "quotes""')
    })
  })

  describe('Authorization Across All Report Types', () => {
    it('should allow OWNER to access all reports', async () => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: 'owner', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      prismaMock.transaction.findMany.mockResolvedValue([])
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: mockDecimal(0) } } as never)

      await expect(generateMonthlyReport(2024, 1)).resolves.toBeDefined()
      await expect(generateAnnualReport(2024)).resolves.toBeDefined()
      await expect(generateScheduleEReport(2024)).resolves.toBeDefined()
      await expect(exportReportToCsv(2024)).resolves.toBeDefined()
    })

    it('should allow ACCOUNTANT to access all reports', async () => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: 'acc', email: 'acc@test.com', name: 'Accountant', role: 'ACCOUNTANT' },
        })
      )

      prismaMock.transaction.findMany.mockResolvedValue([])
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: mockDecimal(0) } } as never)

      await expect(generateMonthlyReport(2024, 1)).resolves.toBeDefined()
      await expect(generateAnnualReport(2024)).resolves.toBeDefined()
      await expect(generateScheduleEReport(2024)).resolves.toBeDefined()
      await expect(exportReportToCsv(2024)).resolves.toBeDefined()
    })

    it('should deny GUEST access to reports', async () => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: 'guest', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(generateMonthlyReport(2024, 1)).rejects.toThrow('Unauthorized')
      await expect(generateAnnualReport(2024)).rejects.toThrow('Unauthorized')
      await expect(generateScheduleEReport(2024)).rejects.toThrow('Unauthorized')
      await expect(exportReportToCsv(2024)).rejects.toThrow('Unauthorized')
    })
  })
})
