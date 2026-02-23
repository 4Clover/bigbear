'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import { revalidatePath } from 'next/cache'
import { assertOwnerOrAccountant } from '@/lib/auth/guards'
import type { TransactionType } from '@prisma/client'
import type { PaginationParams } from '@/types/pagination'
import { DEFAULT_PAGE_SIZE } from '@/types/pagination'

export const createExpense = async (data: {
  categoryId: string
  amount: number
  date: Date
  description?: string
  vendor?: string
  receiptUrls?: string[]
}) => {
  await assertOwnerOrAccountant()

  const schema = z.object({
    categoryId: z.string().min(1),
    amount: z.number().positive(),
    date: z.coerce.date(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    receiptUrls: z.array(z.url()).optional(),
  })

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        type: 'EXPENSE',
        categoryId: validated.data.categoryId,
        amount: validated.data.amount,
        date: validated.data.date,
        description: validated.data.description,
        vendor: validated.data.vendor,
      },
    })

    if (validated.data.receiptUrls && validated.data.receiptUrls.length > 0) {
      for (const url of validated.data.receiptUrls) {
        await tx.receipt.create({
          data: {
            transactionId: newTransaction.id,
            fileUrl: url,
            fileName: url.split('/').pop() ?? 'receipt',
          },
        })
      }
    }

    return newTransaction
  })

  revalidatePath('/owner/finance')
  return { success: true, transaction: { ...transaction, amount: Number(transaction.amount) } }
}

export const updateTransaction = async (
  transactionId: string,
  data: {
    categoryId?: string
    amount?: number
    date?: Date
    description?: string
    vendor?: string
  }
) => {
  await assertOwnerOrAccountant()

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data,
  })

  revalidatePath('/owner/finance')
  return { success: true, transaction: { ...transaction, amount: Number(transaction.amount) } }
}

export const deleteTransaction = async (transactionId: string) => {
  await assertOwnerOrAccountant()

  const receipts = await prisma.receipt.findMany({
    where: { transactionId },
  })

  for (const receipt of receipts) {
    await deleteBlob(receipt.fileUrl).catch((error: unknown) => {
      console.error('Failed to delete blob:', receipt.fileUrl, error)
    })
  }

  await prisma.$transaction([
    prisma.receipt.deleteMany({ where: { transactionId } }),
    prisma.transaction.delete({ where: { id: transactionId } }),
  ])

  revalidatePath('/owner/finance')
  return { success: true }
}

export const addReceiptToTransaction = async (
  transactionId: string,
  receiptData: {
    fileUrl: string
    fileName: string
    fileSize?: number
    mimeType?: string
  }
) => {
  await assertOwnerOrAccountant()

  const receipt = await prisma.receipt.create({
    data: {
      transactionId,
      fileUrl: receiptData.fileUrl,
      fileName: receiptData.fileName,
      fileSize: receiptData.fileSize,
      mimeType: receiptData.mimeType,
    },
  })

  revalidatePath('/owner/finance')
  return { success: true, receipt }
}

export const deleteReceipt = async (receiptId: string) => {
  await assertOwnerOrAccountant()

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  })

  if (!receipt) {
    throw new Error('Receipt not found')
  }

  try {
    await deleteBlob(receipt.fileUrl)
  } catch (error) {
    console.error('Failed to delete blob:', receipt.fileUrl, error)
  }

  await prisma.receipt.delete({
    where: { id: receiptId },
  })

  revalidatePath('/owner/finance')
  return { success: true }
}

export const getTransactions = async (
  filters?: {
    type?: TransactionType
    categoryId?: string
    startDate?: Date
    endDate?: Date
    search?: string
  },
  pagination: PaginationParams = {}
) => {
  await assertOwnerOrAccountant()

  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination
  const where: Record<string, unknown> = {}

  if (filters?.type) where.type = filters.type
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.startDate || filters?.endDate) {
    where.date = {}
    if (filters.startDate) (where.date as Record<string, Date>).gte = filters.startDate
    if (filters.endDate) (where.date as Record<string, Date>).lte = filters.endDate
  }
  if (filters?.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { vendor: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        receipts: true,
      },
      orderBy: { date: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    data: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getFinanceSummary = async (year: number, month?: number) => {
  await assertOwnerOrAccountant()

  const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1)
  const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31)

  const dateFilter = { gte: startDate, lte: endDate }

  const [incomeAgg, expenseAgg, categoryGroups, transactionCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { date: dateFilter, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { date: dateFilter, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { date: dateFilter },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { date: dateFilter } }),
  ])

  const income = Number(incomeAgg._sum.amount) || 0
  const expenses = Number(expenseAgg._sum.amount) || 0

  // Resolve category names for the groupBy results
  const categoryIds = [...new Set(categoryGroups.map((g) => g.categoryId))]
  const categories =
    categoryIds.length > 0
      ? await prisma.expenseCategory.findMany({
          where: { id: { in: categoryIds } },
          take: 100,
        })
      : []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const byCategory: Record<string, number> = {}
  for (const group of categoryGroups) {
    const name = categoryMap.get(group.categoryId) ?? 'Unknown'
    byCategory[name] =
      (byCategory[name] ?? 0) + Number(group._sum.amount ?? 0) * (group.type === 'EXPENSE' ? -1 : 1)
  }

  return {
    income,
    expenses,
    netIncome: income - expenses,
    byCategory,
    transactionCount,
  }
}

export const getExpenseCategories = async () => {
  await assertOwnerOrAccountant()

  return prisma.expenseCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    take: 100,
  })
}
