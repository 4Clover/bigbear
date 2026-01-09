'use server'

import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import { revalidatePath } from 'next/cache'
import { assertOwnerOrAccountant } from '@/lib/auth/guards'
import type { TransactionType } from '@prisma/client'

export const createExpense = async (data: {
  categoryId: string
  amount: number
  date: Date
  description?: string
  vendor?: string
  receiptUrls?: string[]
}) => {
  await assertOwnerOrAccountant()

  const transaction = await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      categoryId: data.categoryId,
      amount: data.amount,
      date: data.date,
      description: data.description,
      vendor: data.vendor,
    },
  })

  if (data.receiptUrls && data.receiptUrls.length > 0) {
    for (const url of data.receiptUrls) {
      await prisma.receipt.create({
        data: {
          transactionId: transaction.id,
          fileUrl: url,
          fileName: url.split('/').pop() || 'receipt',
        },
      })
    }
  }

  revalidatePath('/owner/finance')
  return { success: true, transaction }
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
  return { success: true, transaction }
}

export const deleteTransaction = async (transactionId: string) => {
  await assertOwnerOrAccountant()

  const receipts = await prisma.receipt.findMany({
    where: { transactionId },
  })

  for (const receipt of receipts) {
    try {
      await deleteBlob(receipt.fileUrl)
    } catch (error) {
      console.error('Failed to delete blob:', receipt.fileUrl, error)
    }
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  })

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

export const getTransactions = async (filters?: {
  type?: TransactionType
  categoryId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}) => {
  await assertOwnerOrAccountant()

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

  return prisma.transaction.findMany({
    where,
    include: {
      category: true,
      receipts: true,
    },
    orderBy: { date: 'desc' },
  })
}

export const getFinanceSummary = async (year: number, month?: number) => {
  await assertOwnerOrAccountant()

  const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1)
  const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31)

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
  })

  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const byCategory = transactions.reduce<Record<string, number>>(
    (acc, t) => {
      const key = t.category.name
      if (!acc[key]) acc[key] = 0
      acc[key] += Number(t.amount) * (t.type === 'EXPENSE' ? -1 : 1)
      return acc
    },
    {}
  )

  return {
    income,
    expenses,
    netIncome: income - expenses,
    byCategory,
    transactionCount: transactions.length,
  }
}

export const getExpenseCategories = async () => {
  await assertOwnerOrAccountant()

  return prisma.expenseCategory.findMany({
    orderBy: { sortOrder: 'asc' },
  })
}
