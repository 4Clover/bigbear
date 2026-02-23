import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import type { UserRole } from '@prisma/client'
import { prismaMock } from '../__mocks__/prisma'
import { createMockSession, mockAuth } from '../__mocks__/auth'
import { env as mockEnv } from '../__mocks__/env'

const mockDeleteBlob = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/notifications', () => ({
  sendQuoteReceived: vi.fn().mockResolvedValue(undefined),
  sendMaintenanceCompleted: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/blob', () => ({
  deleteBlob: mockDeleteBlob,
}))

import {
  getAvailableJobs,
  getAssignedJobs,
  getWorkerQuotes,
  submitQuote,
  bookTimeslot,
  submitWorkCompletion,
  startWork,
  createMaintenanceJob,
  getMaintenanceJobs,
  getMaintenanceJob,
  acceptQuote,
  approveWorkCompletion,
  markWorkerPaid,
  cancelJob,
  getWorkers,
  updateWorkerProfile,
  inviteWorker,
  getWorkerProfile,
} from '@/actions/maintenance'
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
import {
  generateMonthlyReport,
  generateAnnualReport,
  generateScheduleEReport,
  exportReportToCsv,
} from '@/actions/reports'

type Role = Extract<UserRole, 'OWNER' | 'WORKER' | 'GUEST' | 'ACCOUNTANT'>

interface MatrixEntry {
  action: string
  allowed: Role[]
  denied: Role[]
  invoke: () => Promise<unknown>
}

const roles: Role[] = ['OWNER', 'WORKER', 'GUEST', 'ACCOUNTANT']

const setRole = (role: Role) => {
  mockAuth.mockResolvedValue(
    createMockSession({
      user: {
        id: `${role.toLowerCase()}-user`,
        email: `${role.toLowerCase()}@test.com`,
        name: role,
        role,
      },
    })
  )
}

const setupTransactionMock = () => {
  ;(prismaMock.$transaction as any).mockImplementation(async (txOrQueries: unknown) => {
    if (typeof txOrQueries === 'function') {
      return txOrQueries(prismaMock)
    }
    return Promise.all(txOrQueries as Promise<unknown>[])
  })
}

const workerProfile = {
  id: 'worker-profile-1',
  userId: 'worker-user',
  businessName: 'Worker Co',
  phoneNumber: null,
  taxId: null,
  address: null,
  services: [],
  isActive: true,
  trustworthiness: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const maintenanceJobBase = {
  id: 'job-1',
  title: 'Fix faucet',
  description: null,
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  dueDate: null,
  images: [],
  notes: null,
  assignedWorkerId: null,
  scheduledDate: null,
  scheduledTime: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const quoteBase = {
  id: 'quote-1',
  jobId: 'job-1',
  workerId: 'worker-profile-1',
  amount: 250 as never,
  description: null,
  estimatedDays: null,
  isApproved: false,
  submittedAt: new Date(),
  expiresAt: null,
}

const completionBase = {
  id: 'completion-1',
  jobId: 'job-1',
  workerId: 'worker-profile-1',
  description: null,
  images: [],
  hoursWorked: null,
  materialsUsed: null,
  unexpectedIssues: null,
  finalAmount: 300 as never,
  isApproved: false,
  approvedAt: null,
  isPaid: false,
  paidAt: null,
  submittedAt: new Date(),
}

const category = {
  id: 'cat-1',
  name: 'Repairs',
  type: 'EXPENSE' as const,
  scheduleELine: 'Line 14',
  isTaxDeductible: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('authorization matrix for critical server actions', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()
    setupTransactionMock()
    mockDeleteBlob.mockResolvedValue(undefined)
  })

  const matrix: MatrixEntry[] = [
    {
      action: 'getAvailableJobs',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
        return getAvailableJobs()
      },
    },
    {
      action: 'getAssignedJobs',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
        return getAssignedJobs()
      },
    },
    {
      action: 'getWorkerQuotes',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.quote.findMany.mockResolvedValueOnce([])
        return getWorkerQuotes()
      },
    },
    {
      action: 'submitQuote',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce(maintenanceJobBase as never)
        prismaMock.quote.findFirst.mockResolvedValueOnce(null)
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          quoteBase,
          { ...maintenanceJobBase, status: 'QUOTED' },
        ])
        return submitQuote({ jobId: 'job-1', amount: 250 })
      },
    },
    {
      action: 'bookTimeslot',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'ASSIGNED',
          assignedWorkerId: workerProfile.id,
        } as never)
        prismaMock.maintenanceJob.update.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'SCHEDULED',
          assignedWorkerId: workerProfile.id,
          scheduledDate: new Date('2026-03-01'),
          scheduledTime: '10:30',
        } as never)
        return bookTimeslot({
          jobId: 'job-1',
          scheduledDate: new Date('2026-03-01'),
          scheduledTime: '10:30',
        })
      },
    },
    {
      action: 'submitWorkCompletion',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'IN_PROGRESS',
          assignedWorkerId: workerProfile.id,
        } as never)
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          completionBase,
          { ...maintenanceJobBase, status: 'COMPLETED' },
        ])
        return submitWorkCompletion({ jobId: 'job-1', images: [] })
      },
    },
    {
      action: 'startWork',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'SCHEDULED',
          assignedWorkerId: workerProfile.id,
        } as never)
        prismaMock.maintenanceJob.update.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'IN_PROGRESS',
          assignedWorkerId: workerProfile.id,
        } as never)
        return startWork('job-1')
      },
    },
    {
      action: 'createMaintenanceJob',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.maintenanceJob.create.mockResolvedValueOnce(maintenanceJobBase as never)
        return createMaintenanceJob({ title: 'Fix faucet' })
      },
    },
    {
      action: 'getMaintenanceJobs',
      allowed: ['OWNER', 'WORKER'],
      denied: ['GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        const session = await mockAuth()
        if (session?.user.role === 'WORKER') {
          prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        }
        prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
        prismaMock.maintenanceJob.count.mockResolvedValueOnce(0)
        return getMaintenanceJobs()
      },
    },
    {
      action: 'getMaintenanceJob',
      allowed: ['OWNER', 'WORKER'],
      denied: ['GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        const session = await mockAuth()
        if (session?.user.role === 'WORKER') {
          prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
          prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
            ...maintenanceJobBase,
            assignedWorkerId: workerProfile.id,
          } as never)
        } else {
          prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce(maintenanceJobBase as never)
        }
        return getMaintenanceJob('job-1')
      },
    },
    {
      action: 'acceptQuote',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.quote.findUnique.mockResolvedValueOnce({
          ...quoteBase,
          job: {
            ...maintenanceJobBase,
            status: 'QUOTED',
          },
        } as never)
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          { ...quoteBase, isApproved: true },
          { ...maintenanceJobBase, status: 'ASSIGNED', assignedWorkerId: workerProfile.id },
        ])
        return acceptQuote('quote-1')
      },
    },
    {
      action: 'approveWorkCompletion',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
          ...completionBase,
          job: {
            ...maintenanceJobBase,
            status: 'COMPLETED',
          },
        } as never)
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          { ...completionBase, isApproved: true },
          { ...maintenanceJobBase, status: 'APPROVED' },
        ])
        return approveWorkCompletion('completion-1')
      },
    },
    {
      action: 'markWorkerPaid',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
          ...completionBase,
          job: {
            ...maintenanceJobBase,
            status: 'APPROVED',
          },
        } as never)
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          { ...completionBase, isPaid: true },
          { ...maintenanceJobBase, status: 'PAID' },
        ])
        return markWorkerPaid('completion-1')
      },
    },
    {
      action: 'cancelJob',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce(maintenanceJobBase as never)
        prismaMock.maintenanceJob.update.mockResolvedValueOnce({
          ...maintenanceJobBase,
          status: 'CANCELLED',
        } as never)
        return cancelJob('job-1')
      },
    },
    {
      action: 'getWorkers',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findMany.mockResolvedValueOnce([])
        return getWorkers()
      },
    },
    {
      action: 'updateWorkerProfile',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.update.mockResolvedValueOnce(workerProfile as never)
        return updateWorkerProfile('worker-profile-1', { isActive: true })
      },
    },
    {
      action: 'inviteWorker',
      allowed: ['OWNER'],
      denied: ['WORKER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null)
        prismaMock.user.create.mockResolvedValueOnce({
          id: 'new-worker-user',
          email: 'new-worker@test.com',
          name: 'New Worker',
          role: 'WORKER',
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          workerProfile,
        } as never)
        return inviteWorker({ email: 'new-worker@test.com', name: 'New Worker' })
      },
    },
    {
      action: 'getWorkerProfile',
      allowed: ['WORKER'],
      denied: ['OWNER', 'GUEST', 'ACCOUNTANT'],
      invoke: async () => {
        prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfile as never)
        return getWorkerProfile()
      },
    },
    {
      action: 'createExpense',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.create.mockResolvedValueOnce({
          id: 'txn-1',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          amount: 100 as never,
          date: new Date('2026-02-01'),
          description: null,
          vendor: null,
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        return createExpense({ categoryId: 'cat-1', amount: 100, date: new Date('2026-02-01') })
      },
    },
    {
      action: 'updateTransaction',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.update.mockResolvedValueOnce({
          id: 'txn-1',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          amount: 120 as never,
          date: new Date('2026-02-01'),
          description: null,
          vendor: null,
          bookingId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        return updateTransaction('txn-1', { amount: 120 })
      },
    },
    {
      action: 'deleteTransaction',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.receipt.findMany.mockResolvedValueOnce([])
        ;(prismaMock.$transaction as any).mockResolvedValueOnce([
          { count: 0 },
          {
            id: 'txn-1',
            type: 'EXPENSE',
            categoryId: 'cat-1',
            amount: 100 as never,
            date: new Date('2026-02-01'),
            description: null,
            vendor: null,
            bookingId: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        return deleteTransaction('txn-1')
      },
    },
    {
      action: 'addReceiptToTransaction',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.receipt.create.mockResolvedValueOnce({
          id: 'receipt-1',
          transactionId: 'txn-1',
          fileUrl: 'https://example.com/receipt.pdf',
          fileName: 'receipt.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        })
        return addReceiptToTransaction('txn-1', {
          fileUrl: 'https://example.com/receipt.pdf',
          fileName: 'receipt.pdf',
        })
      },
    },
    {
      action: 'deleteReceipt',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.receipt.findUnique.mockResolvedValueOnce({
          id: 'receipt-1',
          transactionId: 'txn-1',
          fileUrl: 'https://example.com/receipt.pdf',
          fileName: 'receipt.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        })
        prismaMock.receipt.delete.mockResolvedValueOnce({
          id: 'receipt-1',
          transactionId: 'txn-1',
          fileUrl: 'https://example.com/receipt.pdf',
          fileName: 'receipt.pdf',
          fileSize: null,
          mimeType: null,
          createdAt: new Date(),
        })
        return deleteReceipt('receipt-1')
      },
    },
    {
      action: 'getTransactions',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([
          {
            id: 'txn-1',
            type: 'EXPENSE',
            categoryId: 'cat-1',
            amount: 100 as never,
            date: new Date('2026-02-01'),
            description: null,
            vendor: null,
            bookingId: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            category,
            receipts: [],
          },
        ] as never)
        prismaMock.transaction.count.mockResolvedValueOnce(1)
        return getTransactions()
      },
    },
    {
      action: 'getFinanceSummary',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.aggregate
          .mockResolvedValueOnce({ _sum: { amount: 300 as never } } as never)
          .mockResolvedValueOnce({ _sum: { amount: 100 as never } } as never)
        ;(prismaMock.transaction.groupBy as any).mockResolvedValueOnce([
          { categoryId: 'cat-1', type: 'EXPENSE', _sum: { amount: 100 as never } },
        ])
        prismaMock.transaction.count.mockResolvedValueOnce(2)
        prismaMock.expenseCategory.findMany.mockResolvedValueOnce([category as never])
        return getFinanceSummary(2026)
      },
    },
    {
      action: 'getExpenseCategories',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.expenseCategory.findMany.mockResolvedValueOnce([category as never])
        return getExpenseCategories()
      },
    },
    {
      action: 'generateMonthlyReport',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([
          {
            id: 'txn-1',
            type: 'EXPENSE',
            categoryId: 'cat-1',
            amount: 100 as never,
            date: new Date('2026-02-01'),
            description: null,
            vendor: null,
            bookingId: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            category,
            receipts: [],
          },
        ] as never)
        return generateMonthlyReport(2026, 2)
      },
    },
    {
      action: 'generateAnnualReport',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.aggregate
          .mockResolvedValueOnce({ _sum: { amount: 1000 as never } } as never)
          .mockResolvedValueOnce({ _sum: { amount: 200 as never } } as never)
        prismaMock.transaction.findMany
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([] as never)
        return generateAnnualReport(2026)
      },
    },
    {
      action: 'generateScheduleEReport',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([] as never)
        prismaMock.transaction.aggregate.mockResolvedValueOnce({
          _sum: { amount: 0 as never },
        } as never)
        return generateScheduleEReport(2026)
      },
    },
    {
      action: 'exportReportToCsv',
      allowed: ['OWNER', 'ACCOUNTANT'],
      denied: ['WORKER', 'GUEST'],
      invoke: async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([] as never)
        return exportReportToCsv(2026)
      },
    },
  ]

  it('matrix is complete and includes all critical actions', () => {
    expect(matrix).toHaveLength(30)
    for (const entry of matrix) {
      const uniqueRoles = new Set([...entry.allowed, ...entry.denied])
      expect(uniqueRoles.size).toBe(4)
      expect([...uniqueRoles].sort()).toEqual([...roles].sort())
    }
  })

  for (const entry of matrix) {
    describe(entry.action, () => {
      for (const role of entry.denied) {
        it(`denies ${role}`, async () => {
          setRole(role)
          await expect(entry.invoke()).rejects.toThrow('Unauthorized')
        })
      }

      for (const role of entry.allowed) {
        it(`allows ${role}`, async () => {
          setRole(role)
          await expect(entry.invoke()).resolves.toBeDefined()
        })
      }
    })
  }
})
