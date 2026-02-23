import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '../../__mocks__/prisma'
import { mockAuth, createMockSession } from '../../__mocks__/auth'
import { Prisma } from '@prisma/client'

// Prisma client extension now converts Decimals to plain numbers
const mockDecimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value)

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/env', () => ({
  env: () => ({
    OWNER_EMAIL: 'owner@test.com',
    RESEND_FROM_EMAIL: 'noreply@test.com',
    AUTH_RESEND_KEY: 're_test_key',
  }),
}))

import {
  getAvailableJobs,
  getAssignedJobs as _getAssignedJobs,
  getWorkerQuotes as _getWorkerQuotes,
  submitQuote,
  bookTimeslot as _bookTimeslot,
  submitWorkCompletion,
  startWork as _startWork,
  createMaintenanceJob,
  getMaintenanceJobs as _getMaintenanceJobs,
  getMaintenanceJob as _getMaintenanceJob,
  acceptQuote,
  approveWorkCompletion,
  markWorkerPaid,
  cancelJob,
  getWorkers,
  updateWorkerProfile,
  inviteWorker,
} from '@/actions/maintenance'

describe('Maintenance Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================================================
  // AUTHORIZATION TESTS
  // =============================================================================
  describe('Authorization', () => {
    it('should allow WORKER to get available jobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])

      const result = await getAvailableJobs()
      expect(result).toEqual([])
    })

    it('should reject GUEST from getting available jobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'guest@test.com', name: 'Guest', role: 'GUEST' },
        })
      )

      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })

    it('should reject OWNER from worker-only actions', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '3', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })

    it('should allow OWNER to create maintenance jobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      const mockJob = {
        id: 'job-1',
        title: 'Fix sink',
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

      prismaMock.maintenanceJob.create.mockResolvedValueOnce(mockJob)

      const result = await createMaintenanceJob({ title: 'Fix sink' })

      expect(result.success).toBe(true)
      expect(result.job).toBeDefined()
    })

    it('should reject WORKER from creating maintenance jobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(createMaintenanceJob({ title: 'Fix sink' })).rejects.toThrow('Unauthorized')
    })

    it('should reject unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)

      await expect(getAvailableJobs()).rejects.toThrow('Unauthorized')
    })
  })

  describe('Worker data scope hardening', () => {
    it('should return only assigned jobs for WORKER in getMaintenanceJobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: 'worker-user-1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      prismaMock.workerProfile.findUnique.mockResolvedValueOnce({
        id: 'worker-profile-1',
        userId: 'worker-user-1',
        businessName: null,
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: true,
        trustworthiness: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
      prismaMock.maintenanceJob.count.mockResolvedValueOnce(0)

      await _getMaintenanceJobs()

      expect(prismaMock.workerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'worker-user-1' },
      })
      expect(prismaMock.maintenanceJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { assignedWorkerId: 'worker-profile-1' } })
      )
    })

    it('should throw Unauthorized for WORKER fetching unassigned job', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: 'worker-user-1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      prismaMock.workerProfile.findUnique.mockResolvedValueOnce({
        id: 'worker-profile-1',
        userId: 'worker-user-1',
        businessName: null,
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: true,
        trustworthiness: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-foreign',
        title: 'Fix roof',
        description: null,
        priority: 'HIGH' as const,
        status: 'ASSIGNED' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-2',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [],
        workCompletions: [],
        assignedWorker: null,
      } as never)

      await expect(_getMaintenanceJob('job-foreign')).rejects.toThrow('Unauthorized')
    })

    it('should keep OWNER access unchanged in getMaintenanceJobs', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: 'owner-user-1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      prismaMock.maintenanceJob.findMany.mockResolvedValueOnce([])
      prismaMock.maintenanceJob.count.mockResolvedValueOnce(0)

      await _getMaintenanceJobs()

      expect(prismaMock.workerProfile.findUnique).not.toHaveBeenCalled()
      expect(prismaMock.maintenanceJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            quotes: { include: { worker: { include: { user: true } } } },
            workCompletions: { include: { worker: { include: { user: true } } } },
            assignedWorker: { include: { user: true } },
          },
        })
      )
    })

    it('should not expose worker email phone or taxId in WORKER-scoped results', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: 'worker-user-1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      prismaMock.workerProfile.findUnique.mockResolvedValueOnce({
        id: 'worker-profile-1',
        userId: 'worker-user-1',
        businessName: null,
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: true,
        trustworthiness: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'ASSIGNED' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [
          {
            id: 'quote-1',
            jobId: 'job-1',
            workerId: 'worker-profile-2',
            amount: mockDecimal(250),
            description: null,
            estimatedDays: null,
            isApproved: false,
            submittedAt: new Date(),
            expiresAt: null,
            worker: {
              id: 'worker-profile-2',
              businessName: 'Other Worker',
              services: ['Plumbing'],
              isActive: true,
              trustworthiness: null,
              notes: null,
              user: {
                id: 'other-user-id',
                name: 'Other Worker',
              },
            },
          },
        ],
        workCompletions: [],
        assignedWorker: null,
      } as never)

      const result = await _getMaintenanceJob('job-1')

      expect(prismaMock.maintenanceJob.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            quotes: {
              include: {
                worker: {
                  select: expect.objectContaining({
                    user: { select: { id: true, name: true } },
                  }),
                },
              },
            },
            workCompletions: {
              include: {
                worker: {
                  select: expect.objectContaining({
                    user: { select: { id: true, name: true } },
                  }),
                },
              },
            },
            assignedWorker: {
              select: expect.objectContaining({
                user: { select: { id: true, name: true } },
              }),
            },
          },
        })
      )
      expect(result?.quotes[0]?.worker.user).not.toHaveProperty('email')
      expect(result?.quotes[0]?.worker).not.toHaveProperty('phoneNumber')
      expect(result?.quotes[0]?.worker).not.toHaveProperty('taxId')
    })
  })

  // =============================================================================
  // submitQuote TESTS
  // =============================================================================
  describe('submitQuote', () => {
    const mockWorkerProfile = {
      id: 'worker-profile-1',
      userId: '1',
      businessName: 'Test Business',
      services: [],
      phoneNumber: null,
      address: null,
      taxId: null,
      isActive: true,
      trustworthiness: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )
    })

    it('should submit a quote for an OPEN job', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
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
      prismaMock.quote.findFirst.mockResolvedValueOnce(null)

      const mockQuote = {
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(500),
        description: 'Will fix the sink',
        estimatedDays: 1,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
      }
      prismaMock.$transaction.mockResolvedValueOnce([mockQuote, {} as never])

      const result = await submitQuote({
        jobId: 'job-1',
        amount: 500,
        description: 'Will fix the sink',
        estimatedDays: 1,
      })

      expect(result.success).toBe(true)
      expect(result.quote).toBeDefined()
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should reject quote for non-OPEN job', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'ASSIGNED' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'other-worker',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(submitQuote({ jobId: 'job-1', amount: 500 })).rejects.toThrow(
        'Job not available for quoting'
      )
    })

    it('should reject duplicate quote from same worker', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
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
      prismaMock.quote.findFirst.mockResolvedValueOnce({
        id: 'existing-quote',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(400),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
      })

      await expect(submitQuote({ jobId: 'job-1', amount: 500 })).rejects.toThrow(
        'You have already submitted a quote for this job'
      )
    })

    it('should reject quote when job is assigned to another worker', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'OPEN' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'other-worker-profile',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(submitQuote({ jobId: 'job-1', amount: 500 })).rejects.toThrow(
        'Job already assigned to another worker'
      )
    })

    it('should allow quote when job is assigned to the same worker', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'OPEN' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      prismaMock.quote.findFirst.mockResolvedValueOnce(null)

      const mockQuote = {
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(500),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
      }
      prismaMock.$transaction.mockResolvedValueOnce([mockQuote, {} as never])

      const result = await submitQuote({ jobId: 'job-1', amount: 500 })

      expect(result.success).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should reject if worker profile not found', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(null)

      await expect(submitQuote({ jobId: 'job-1', amount: 500 })).rejects.toThrow(
        'Worker profile not found'
      )
    })
  })

  // =============================================================================
  // submitQuote $transaction rollback TESTS
  // =============================================================================
  describe('submitQuote transaction atomicity', () => {
    const mockWorkerProfile = {
      id: 'worker-profile-1',
      userId: '1',
      businessName: 'Test Business',
      services: [],
      phoneNumber: null,
      address: null,
      taxId: null,
      isActive: true,
      trustworthiness: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )
    })

    it('should rollback job status if quote creation fails in transaction', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
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
      prismaMock.quote.findFirst.mockResolvedValueOnce(null)
      prismaMock.$transaction.mockRejectedValueOnce(new Error('DB error'))

      await expect(submitQuote({ jobId: 'job-1', amount: 500 })).rejects.toThrow('DB error')

      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should use $transaction for atomic quote creation and job status update', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
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
      prismaMock.quote.findFirst.mockResolvedValueOnce(null)

      const mockQuote = {
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(500),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
      }
      prismaMock.$transaction.mockResolvedValueOnce([mockQuote, {} as never])

      const result = await submitQuote({ jobId: 'job-1', amount: 500 })

      expect(result.success).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================================================
  // submitWorkCompletion TESTS
  // =============================================================================
  describe('submitWorkCompletion', () => {
    const mockWorkerProfile = {
      id: 'worker-profile-1',
      userId: '1',
      businessName: 'Test Business',
      services: [],
      phoneNumber: null,
      address: null,
      taxId: null,
      isActive: true,
      trustworthiness: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )
    })

    it('should submit work completion atomically with $transaction', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'IN_PROGRESS' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const mockCompletion = {
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        description: 'Fixed the sink',
        images: [],
        hoursWorked: mockDecimal(2),
        materialsUsed: null,
        unexpectedIssues: null,
        finalAmount: mockDecimal(500),
        isApproved: false,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: null,
        paidAt: null,
      }
      prismaMock.$transaction.mockResolvedValueOnce([mockCompletion, {} as never])

      const result = await submitWorkCompletion({
        jobId: 'job-1',
        description: 'Fixed the sink',
        images: [],
        finalAmount: 500,
      })

      expect(result.success).toBe(true)
      expect(result.completion).toBeDefined()
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    })

    it('should rollback job status if work completion creation fails in transaction', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'IN_PROGRESS' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      prismaMock.$transaction.mockRejectedValueOnce(new Error('DB error'))

      await expect(
        submitWorkCompletion({
          jobId: 'job-1',
          description: 'Fixed the sink',
          images: [],
          finalAmount: 500,
        })
      ).rejects.toThrow('DB error')

      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should reject if job is not in completable state', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'OPEN' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-profile-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        submitWorkCompletion({
          jobId: 'job-1',
          description: 'Fixed',
          images: [],
          finalAmount: 500,
        })
      ).rejects.toThrow('Job is not in a state that can be completed')
    })

    it('should reject if job is not assigned to the worker', async () => {
      prismaMock.workerProfile.findUnique.mockResolvedValueOnce(mockWorkerProfile)
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'IN_PROGRESS' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'other-worker-profile',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        submitWorkCompletion({
          jobId: 'job-1',
          description: 'Fixed',
          images: [],
          finalAmount: 500,
        })
      ).rejects.toThrow('Job not assigned to you')
    })
  })

  // =============================================================================
  // acceptQuote TESTS
  // =============================================================================
  describe('acceptQuote', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should accept a quote and assign worker', async () => {
      prismaMock.quote.findUnique.mockResolvedValueOnce({
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(500),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
        job: {
          id: 'job-1',
          title: 'Fix sink',
          description: null,
          priority: 'MEDIUM' as const,
          status: 'QUOTED' as const,
          dueDate: null,
          images: [],
          notes: null,
          assignedWorkerId: null,
          scheduledDate: null,
          scheduledTime: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as never)

      prismaMock.$transaction.mockImplementationOnce(async (fn) => {
        if (typeof fn === 'function') {
          return fn(prismaMock)
        }
        return Promise.all(fn)
      })

      const result = await acceptQuote('quote-1')

      expect(result.success).toBe(true)
    })

    it('should reject if quote not found', async () => {
      prismaMock.quote.findUnique.mockResolvedValueOnce(null)

      await expect(acceptQuote('non-existent')).rejects.toThrow('Quote not found')
    })

    it('should reject if job is not in QUOTED state', async () => {
      prismaMock.quote.findUnique.mockResolvedValueOnce({
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        amount: mockDecimal(500),
        description: null,
        estimatedDays: null,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: null,
        job: {
          id: 'job-1',
          title: 'Fix sink',
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
        },
      } as never)

      await expect(acceptQuote('quote-1')).rejects.toThrow('Job is not in quoted state')
    })
  })

  // =============================================================================
  // approveWorkCompletion + markWorkerPaid TESTS
  // =============================================================================
  describe('Work Completion Workflow', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should approve work completion', async () => {
      prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        description: 'Fixed the sink',
        images: ['url1', 'url2'],
        hoursWorked: mockDecimal(2),
        materialsUsed: 'Pipe',
        unexpectedIssues: null,
        finalAmount: mockDecimal(500),
        isApproved: false,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: null,
        paidAt: null,
        job: {
          id: 'job-1',
          status: 'COMPLETED' as const,
        },
      } as never)

      prismaMock.$transaction.mockImplementationOnce(async (fn) => {
        if (typeof fn === 'function') {
          return fn(prismaMock)
        }
        return Promise.all(fn)
      })

      const result = await approveWorkCompletion('completion-1')

      expect(result.success).toBe(true)
    })

    it('should reject approval if job is not COMPLETED', async () => {
      prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        description: null,
        images: [],
        hoursWorked: null,
        materialsUsed: null,
        unexpectedIssues: null,
        finalAmount: null,
        isApproved: false,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: null,
        paidAt: null,
        job: {
          id: 'job-1',
          status: 'IN_PROGRESS' as const,
        },
      } as never)

      await expect(approveWorkCompletion('completion-1')).rejects.toThrow(
        'Job is not in completed state'
      )
    })

    it('should mark worker as paid', async () => {
      prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        description: null,
        images: [],
        hoursWorked: null,
        materialsUsed: null,
        unexpectedIssues: null,
        finalAmount: mockDecimal(500),
        isApproved: true,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: new Date(),
        paidAt: null,
        job: {
          id: 'job-1',
          status: 'APPROVED' as const,
        },
      } as never)

      prismaMock.$transaction.mockImplementationOnce(async (fn) => {
        if (typeof fn === 'function') {
          return fn(prismaMock)
        }
        return Promise.all(fn)
      })

      const result = await markWorkerPaid('completion-1')

      expect(result.success).toBe(true)
    })

    it('should reject payment if work not approved', async () => {
      prismaMock.workCompletion.findUnique.mockResolvedValueOnce({
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-profile-1',
        description: null,
        images: [],
        hoursWorked: null,
        materialsUsed: null,
        unexpectedIssues: null,
        finalAmount: null,
        isApproved: false,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: null,
        paidAt: null,
        job: {
          id: 'job-1',
          status: 'COMPLETED' as const,
        },
      } as never)

      await expect(markWorkerPaid('completion-1')).rejects.toThrow(
        'Work must be approved before marking as paid'
      )
    })
  })

  // =============================================================================
  // inviteWorker TESTS
  // =============================================================================
  describe('inviteWorker', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should create user and worker profile', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null)
      prismaMock.user.create.mockResolvedValueOnce({
        id: 'new-user',
        email: 'newworker@test.com',
        name: 'New Worker',
        emailVerified: null,
        image: null,
        phone: null,
        role: 'WORKER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        workerProfile: {
          id: 'new-profile',
          userId: 'new-user',
          businessName: 'New Business',
          services: ['Plumbing'],
          phoneNumber: '555-1234',
          address: null,
          taxId: null,
          isActive: true,
          trustworthiness: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as never)

      const result = await inviteWorker({
        email: 'newworker@test.com',
        name: 'New Worker',
        businessName: 'New Business',
        phoneNumber: '555-1234',
        services: ['Plumbing'],
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should reject if user already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'existing@test.com',
        name: 'Existing',
        emailVerified: null,
        image: null,
        phone: null,
        role: 'WORKER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        inviteWorker({
          email: 'existing@test.com',
          name: 'Existing',
        })
      ).rejects.toThrow('User with this email already exists')
    })

    it('should reject WORKER from inviting workers', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(
        inviteWorker({
          email: 'newworker@test.com',
          name: 'New Worker',
        })
      ).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // cancelJob TESTS
  // =============================================================================
  describe('cancelJob', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should cancel an OPEN job', async () => {
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
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
      prismaMock.maintenanceJob.update.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'CANCELLED' as const,
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

      const result = await cancelJob('job-1')

      expect(result.success).toBe(true)
    })

    it('should reject cancelling a COMPLETED job', async () => {
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        title: 'Fix sink',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'COMPLETED' as const,
        dueDate: null,
        images: [],
        notes: null,
        assignedWorkerId: 'worker-1',
        scheduledDate: null,
        scheduledTime: null,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(cancelJob('job-1')).rejects.toThrow('Cannot cancel a completed job')
    })

    it('should reject if job not found', async () => {
      prismaMock.maintenanceJob.findUnique.mockResolvedValueOnce(null)

      await expect(cancelJob('non-existent')).rejects.toThrow('Job not found')
    })
  })

  // =============================================================================
  // getWorkers TESTS
  // =============================================================================
  describe('getWorkers', () => {
    it('should return all worker profiles', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )

      prismaMock.workerProfile.findMany.mockResolvedValueOnce([
        {
          id: 'worker-1',
          userId: 'user-1',
          businessName: 'Plumbing Co',
          services: ['Plumbing'],
          phoneNumber: '555-1234',
          address: null,
          taxId: null,
          isActive: true,
          trustworthiness: 4,
          notes: 'Good worker',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            email: 'worker@test.com',
            name: 'Worker',
          },
          _count: {
            quotes: 5,
            workCompletions: 3,
            assignedJobs: 1,
          },
        },
      ] as never)

      const result = await getWorkers()

      expect(result).toHaveLength(1)
      expect(result[0]?.businessName).toBe('Plumbing Co')
    })

    it('should reject WORKER from getting workers list', async () => {
      mockAuth.mockResolvedValueOnce(
        createMockSession({
          user: { id: '2', email: 'worker@test.com', name: 'Worker', role: 'WORKER' },
        })
      )

      await expect(getWorkers()).rejects.toThrow('Unauthorized')
    })
  })

  // =============================================================================
  // updateWorkerProfile TESTS
  // =============================================================================
  describe('updateWorkerProfile', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockSession({
          user: { id: '1', email: 'owner@test.com', name: 'Owner', role: 'OWNER' },
        })
      )
    })

    it('should update trustworthiness', async () => {
      prismaMock.workerProfile.update.mockResolvedValueOnce({
        id: 'worker-1',
        userId: 'user-1',
        businessName: 'Plumbing Co',
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: true,
        trustworthiness: 5,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateWorkerProfile('worker-1', { trustworthiness: 5 })

      expect(result.success).toBe(true)
      expect(prismaMock.workerProfile.update).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
        data: { trustworthiness: 5 },
      })
    })

    it('should update notes', async () => {
      prismaMock.workerProfile.update.mockResolvedValueOnce({
        id: 'worker-1',
        userId: 'user-1',
        businessName: 'Plumbing Co',
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: true,
        trustworthiness: null,
        notes: 'Updated notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateWorkerProfile('worker-1', { notes: 'Updated notes' })

      expect(result.success).toBe(true)
    })

    it('should toggle isActive', async () => {
      prismaMock.workerProfile.update.mockResolvedValueOnce({
        id: 'worker-1',
        userId: 'user-1',
        businessName: 'Plumbing Co',
        services: [],
        phoneNumber: null,
        address: null,
        taxId: null,
        isActive: false,
        trustworthiness: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateWorkerProfile('worker-1', { isActive: false })

      expect(result.success).toBe(true)
    })
  })
})
