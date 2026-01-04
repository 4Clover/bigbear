'use server'

import { prisma } from '@/lib/prisma'
import { assertOwnerOrAccountant } from '@/lib/auth/guards'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns'
import type { Transaction, ExpenseCategory, Receipt } from '@prisma/client'

// ============================================================================
// Type Definitions
// ============================================================================

type TransactionWithCategory = Transaction & { category: ExpenseCategory; receipts: Receipt[] }

export interface MonthlyReportData {
  period: string
  year: number
  month: number
  income: number
  expenses: number
  netIncome: number
  byCategory: Record<string, { income: number; expenses: number; transactions: TransactionWithCategory[] }>
  transactions: TransactionWithCategory[]
}

export interface AnnualReportData {
  year: number
  totalIncome: number
  totalExpenses: number
  netIncome: number
  scheduleE: Record<string, { label: string; amount: number }>
  monthlyBreakdown: { month: string; income: number; expenses: number; net: number }[]
}

export interface ScheduleELineItem {
  line: string
  categories: string[]
  total: number
  transactions: TransactionWithCategory[]
}

export interface ScheduleEReportData {
  year: number
  rentalIncome: number
  lineItems: ScheduleELineItem[]
  totalExpenses: number
}

// ============================================================================
// Report Generation Functions
// ============================================================================

export const generateMonthlyReport = async (year: number, month: number): Promise<MonthlyReportData> => {
  await assertOwnerOrAccountant()

  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: { category: true, receipts: true },
    orderBy: { date: 'asc' },
  })

  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const byCategory = transactions.reduce<
    Record<string, { income: number; expenses: number; transactions: TransactionWithCategory[] }>
  >((acc, t) => {
    const key = t.category.name
    acc[key] ??= { income: 0, expenses: 0, transactions: [] }
    if (t.type === 'INCOME') acc[key].income += Number(t.amount)
    else acc[key].expenses += Number(t.amount)
    acc[key].transactions.push(t)
    return acc
  }, {})

  return {
    period: format(start, 'MMMM yyyy'),
    year,
    month,
    income,
    expenses,
    netIncome: income - expenses,
    byCategory,
    transactions,
  }
}

export const generateAnnualReport = async (year: number): Promise<AnnualReportData> => {
  await assertOwnerOrAccountant()

  const start = startOfYear(new Date(year, 0))
  const end = endOfYear(new Date(year, 0))

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: { category: true },
  })

  // Group by Schedule E line items
  const scheduleE = transactions
    .filter((t) => t.type === 'EXPENSE' && t.category.isTaxDeductible)
    .reduce<Record<string, { label: string; amount: number }>>((acc, t) => {
      const line = t.category.scheduleELine ?? 'Other'
      acc[line] ??= { label: t.category.name, amount: 0 }
      acc[line].amount += Number(t.amount)
      return acc
    }, {})

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthlyBreakdown = await getMonthlyBreakdown(year)

  return {
    year,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    scheduleE,
    monthlyBreakdown,
  }
}

const getMonthlyBreakdown = async (
  year: number
): Promise<{ month: string; income: number; expenses: number; net: number }[]> => {
  const months = []
  for (let month = 1; month <= 12; month++) {
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    })

    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    months.push({
      month: format(new Date(year, month - 1), 'MMM'),
      income,
      expenses,
      net: income - expenses,
    })
  }
  return months
}

export const generateScheduleEReport = async (year: number): Promise<ScheduleEReportData> => {
  await assertOwnerOrAccountant()

  const start = startOfYear(new Date(year, 0))
  const end = endOfYear(new Date(year, 0))

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
      type: 'EXPENSE',
    },
    include: { category: true, receipts: true },
  })

  // Group by Schedule E line
  const lineItems: Record<string, ScheduleELineItem> = {}

  for (const t of transactions) {
    const line = t.category.scheduleELine ?? 'Line 19'
    lineItems[line] ??= {
      line,
      categories: [],
      total: 0,
      transactions: [],
    }
    if (!lineItems[line].categories.includes(t.category.name)) {
      lineItems[line].categories.push(t.category.name)
    }
    lineItems[line].total += Number(t.amount)
    lineItems[line].transactions.push(t)
  }

  // Get rental income
  const income = await prisma.transaction.aggregate({
    where: {
      date: { gte: start, lte: end },
      type: 'INCOME',
    },
    _sum: { amount: true },
  })

  // Sort line items by line number
  const sortedLineItems = Object.values(lineItems).sort((a, b) => {
    const aNum = parseInt(a.line.replace('Line ', '')) || 99
    const bNum = parseInt(b.line.replace('Line ', '')) || 99
    return aNum - bNum
  })

  return {
    year,
    rentalIncome: Number(income._sum.amount) || 0,
    lineItems: sortedLineItems,
    totalExpenses: sortedLineItems.reduce((sum, item) => sum + item.total, 0),
  }
}

export const exportReportToCsv = async (year: number, month?: number): Promise<string> => {
  await assertOwnerOrAccountant()

  const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1)
  const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31)

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
    orderBy: { date: 'asc' },
  })

  const headers = ['Date', 'Type', 'Category', 'Description', 'Vendor', 'Amount']
  const rows = transactions.map((t) => [
    format(t.date, 'yyyy-MM-dd'),
    t.type,
    t.category.name,
    t.description ?? '',
    t.vendor ?? '',
    Number(t.amount).toFixed(2),
  ])

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
}
