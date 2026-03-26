import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Prisma } from '@prisma/client'
import { prismaMock } from '../__mocks__/prisma'
import { mockAuth, createMockSession } from '../__mocks__/auth'

const mockDecimal = (value: number) => value as unknown as Prisma.Decimal

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: () => ({
    OWNER_EMAIL: 'owner@test.com',
    RESEND_FROM_EMAIL: 'noreply@test.com',
    AUTH_RESEND_KEY: 're_test_key',
  }),
}))

vi.mock('@/lib/notifications', () => ({
  sendQuoteReceived: vi.fn().mockResolvedValue(undefined),
  sendMaintenanceCompleted: vi.fn().mockResolvedValue(undefined),
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
  cancelJob,
  getWorkers,
} from '@/actions/maintenance'

const ownerSession = () =>
  createMockSession({
    user: {
      id: 'owner-user',
      email: 'owner@test.com',
      name: 'Owner',
      role: 'OWNER',
      isFamilyMember: false,
    },
  })

const workerASession = () =>
  createMockSession({
    user: {
      id: 'worker-a-user',
      email: 'worker-a@test.com',
      name: 'Worker A',
      role: 'WORKER',
      isFamilyMember: false,
    },
  })

const guestSession = () =>
  createMockSession({
    user: {
      id: 'guest-user',
      email: 'guest@test.com',
      name: 'Guest',
      role: 'GUEST',
      isFamilyMember: false,
    },
  })

const accountantSession = () =>
  createMockSession({
    user: {
      id: 'accountant-user',
      email: 'accountant@test.com',
      name: 'Accountant',
      role: 'ACCOUNTANT',
      isFamilyMember: false,
    },
  })

const workerProfileA = {
  id: 'worker-profile-a',
  userId: 'worker-a-user',
  businessName: 'Worker A Co',
  services: ['Plumbing'],
  phoneNumber: null,
  address: null,
  taxId: null,
  isActive: true,
  trustworthiness: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Auth Regression - Maintenance Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GUEST exclusion from maintenance actions', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(guestSession())
    })

    it('GUEST rejected from getAvailableJobs', async () => {
      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from getAssignedJobs', async () => {
      await expect(getAssignedJobs()).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from getWorkerQuotes', async () => {
      await expect(getWorkerQuotes()).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from submitQuote', async () => {
      await expect(submitQuote({ jobId: 'job-1', amount: 100 })).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from createMaintenanceJob', async () => {
      await expect(createMaintenanceJob({ title: 'Test' })).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from getMaintenanceJobs', async () => {
      await expect(getMaintenanceJobs()).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from getMaintenanceJob', async () => {
      await expect(getMaintenanceJob('job-1')).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from acceptQuote', async () => {
      await expect(acceptQuote('quote-1')).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from approveWorkCompletion', async () => {
      await expect(approveWorkCompletion('c-1')).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from cancelJob', async () => {
      await expect(cancelJob('job-1')).rejects.toThrow('Unauthorized')
    })

    it('GUEST rejected from getWorkers', async () => {
      await expect(getWorkers()).rejects.toThrow('Unauthorized')
    })
  })

  describe('ACCOUNTANT exclusion from maintenance actions', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(accountantSession())
    })

    it('ACCOUNTANT rejected from getAvailableJobs', async () => {
      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from createMaintenanceJob', async () => {
      await expect(createMaintenanceJob({ title: 'Test' })).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from getMaintenanceJobs', async () => {
      await expect(getMaintenanceJobs()).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from getMaintenanceJob', async () => {
      await expect(getMaintenanceJob('job-1')).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from submitQuote', async () => {
      await expect(submitQuote({ jobId: 'job-1', amount: 100 })).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from acceptQuote', async () => {
      await expect(acceptQuote('quote-1')).rejects.toThrow('Unauthorized')
    })

    it('ACCOUNTANT rejected from cancelJob', async () => {
      await expect(cancelJob('job-1')).rejects.toThrow('Unauthorized')
    })
  })

  describe('OWNER access patterns', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(ownerSession())
    })

    it('OWNER can createMaintenanceJob', async () => {
      prismaMock.maintenanceJob.create.mockResolvedValueOnce({
        id: 'job-new',
        title: 'Fix roof',
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
      })

      const result = await createMaintenanceJob({ title: 'Fix roof' })
      expect(result.success).toBe(true)
    })

    it('OWNER can getMaintenanceJobs', async () => {
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
      prismaMock.maintenanceJob.count.mockResolvedValueOnce(0)

      const result = await getMaintenanceJobs()
      expect(result.total).toBe(0)
    })

    it('OWNER can getMaintenanceJob', async () => {
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Test Job',
      } as never)

      const result = await getMaintenanceJob('job-1')
      expect(result?.id).toBe('job-1')
    })

    it('OWNER can acceptQuote', async () => {
      prismaMock.quote.findUnique.mockResolvedValueOnce({
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-a',
        amount: mockDecimal(500),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
        job: {
          id: 'job-1',
          status: 'QUOTED' as const,
        },
      } as never)

      prismaMock.$transaction.mockImplementationOnce(async (fn) => {
        if (typeof fn === 'function') return fn(prismaMock)
        return Promise.all(fn)
      })

      const result = await acceptQuote('quote-1')
      expect(result.success).toBe(true)
    })

    it('OWNER rejected from worker-only getAvailableJobs', async () => {
      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })

    it('OWNER rejected from worker-only submitQuote', async () => {
      await expect(submitQuote({ jobId: 'j-1', amount: 100 })).rejects.toThrow('Unauthorized')
    })

    it('OWNER rejected from worker-only startWork', async () => {
      await expect(startWork('job-1')).rejects.toThrow('Unauthorized')
    })
  })

  describe('WORKER access patterns', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(workerASession())
    })

    it('WORKER can getAvailableJobs', async () => {
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])

      const result = await getAvailableJobs()
      expect(result).toEqual([])
    })

    it('WORKER can getAssignedJobs', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])

      const result = await getAssignedJobs()
      expect(result).toEqual([])
    })

    it('WORKER can getMaintenanceJobs via shared guard', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
      prismaMock.maintenanceJob.count.mockResolvedValueOnce(0)

      const result = await getMaintenanceJobs()
      expect(result.total).toBe(0)
    })

    it('WORKER rejected from owner-only createMaintenanceJob', async () => {
      await expect(createMaintenanceJob({ title: 'Test' })).rejects.toThrow('Unauthorized')
    })

    it('WORKER rejected from owner-only acceptQuote', async () => {
      await expect(acceptQuote('quote-1')).rejects.toThrow('Unauthorized')
    })

    it('WORKER rejected from owner-only cancelJob', async () => {
      await expect(cancelJob('job-1')).rejects.toThrow('Unauthorized')
    })

    it('WORKER rejected from owner-only approveWorkCompletion', async () => {
      await expect(approveWorkCompletion('c-1')).rejects.toThrow('Unauthorized')
    })

    it('WORKER rejected from owner-only getWorkers', async () => {
      await expect(getWorkers()).rejects.toThrow('Unauthorized')
    })
  })

  describe('Worker Isolation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(workerASession())
    })

    it('getAssignedJobs scopes query to current worker profile', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([
        { id: 'job-for-a', assignedWorkerId: 'worker-profile-a' } as never,
      ])

      await getAssignedJobs()

      expect(prismaMock.maintenanceJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedWorkerId: 'worker-profile-a' },
        })
      )
    })

    it('getWorkerQuotes scopes query to current worker profile', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.quote.findMany.mockResolvedValueOnce([])

      await getWorkerQuotes()

      expect(prismaMock.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workerId: 'worker-profile-a' },
        })
      )
    })

    it('Worker A cannot startWork on job assigned to Worker B', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-for-b',
        assignedWorkerId: 'worker-profile-b',
        status: 'SCHEDULED' as const,
      } as never)

      await expect(startWork('job-for-b')).rejects.toThrow('Job not assigned to you')
    })

    it('Worker A cannot bookTimeslot on job assigned to Worker B', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-for-b',
        assignedWorkerId: 'worker-profile-b',
        status: 'ASSIGNED' as const,
      } as never)

      await expect(
        bookTimeslot({
          jobId: 'job-for-b',
          scheduledDate: new Date(),
          scheduledTime: '10:00',
        })
      ).rejects.toThrow('Job not assigned to you')
    })

    it('Worker A cannot submitWorkCompletion on job assigned to Worker B', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(workerProfileA)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-for-b',
        assignedWorkerId: 'worker-profile-b',
        status: 'IN_PROGRESS' as const,
      } as never)

      await expect(
        submitWorkCompletion({
          jobId: 'job-for-b',
          images: [],
        })
      ).rejects.toThrow('Job not assigned to you')
    })
  })

  describe('Owner full visibility', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(ownerSession())
    })

    it('Owner sees all jobs regardless of worker assignment', async () => {
      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([
        { id: 'job-1', assignedWorkerId: 'worker-profile-a' },
        { id: 'job-2', assignedWorkerId: 'worker-profile-b' },
        { id: 'job-3', assignedWorkerId: null },
      ] as never)
      prismaMock.maintenanceJob.count.mockResolvedValueOnce(3)

      const result = await getMaintenanceJobs()

      expect(result.total).toBe(3)
      expect(result.data).toHaveLength(3)
    })

    it('Owner can view any single job regardless of assignment', async () => {
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-assigned-to-b',
        assignedWorkerId: 'worker-profile-b',
        title: 'Worker B Job',
      } as never)

      const result = await getMaintenanceJob('job-assigned-to-b')
      expect(result?.id).toBe('job-assigned-to-b')
    })
  })

  describe('Guard consistency', () => {
    it('unauthenticated user rejected from worker actions', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
      await expect(getAssignedJobs()).rejects.toThrow('Unauthorized')
      await expect(submitQuote({ jobId: 'j', amount: 1 })).rejects.toThrow('Unauthorized')
    })

    it('unauthenticated user rejected from owner actions', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(createMaintenanceJob({ title: 'T' })).rejects.toThrow('Unauthorized')
      await expect(acceptQuote('q-1')).rejects.toThrow('Unauthorized')
      await expect(cancelJob('j-1')).rejects.toThrow('Unauthorized')
    })

    it('unauthenticated user rejected from shared actions', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(getMaintenanceJobs()).rejects.toThrow('Unauthorized')
      await expect(getMaintenanceJob('j-1')).rejects.toThrow('Unauthorized')
    })

    it('GUEST error message is exactly Unauthorized', async () => {
      mockAuth.mockResolvedValue(guestSession())

      const error = await getAvailableJobs().catch((e: unknown) => e)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Unauthorized')
    })
  })
})
