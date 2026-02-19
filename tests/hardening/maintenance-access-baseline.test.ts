import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { createMockSession } from '../__mocks__/auth'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const mockAssertOwner = vi.hoisted(() => vi.fn())
const mockAssertWorker = vi.hoisted(() => vi.fn())
const mockAssertOwnerOrWorker = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/guards', () => ({
  assertOwner: mockAssertOwner,
  assertWorker: mockAssertWorker,
  assertOwnerOrWorker: mockAssertOwnerOrWorker,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: () => ({
    OWNER_EMAIL: 'owner@test.com',
  }),
}))

const mockSendQuoteReceived = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications', () => ({
  sendQuoteReceived: mockSendQuoteReceived,
  sendMaintenanceCompleted: vi.fn(),
}))

const { getMaintenanceJobs, getMaintenanceJob, submitQuote } = await import('@/actions/maintenance')

describe('maintenance access baseline behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendQuoteReceived.mockResolvedValue(undefined)
  })

  it('returns only assigned jobs for WORKER in getMaintenanceJobs', async () => {
    // FIXED (T4): worker now sees only jobs assigned to them.
    mockAssertOwnerOrWorker.mockResolvedValue(
      createMockSession({
        user: {
          id: 'worker-user-1',
          email: 'worker@test.com',
          name: 'Worker',
          role: 'WORKER',
        },
      })
    )

    prismaMock.workerProfile.findUnique.mockResolvedValue({
      id: 'worker-profile-1',
      userId: 'worker-user-1',
    } as never)

    prismaMock.maintenanceJob.findMany.mockResolvedValue([
      { id: 'job-1', title: 'Worker-owned', assignedWorkerId: 'worker-profile-1' },
    ] as never)
    prismaMock.maintenanceJob.count.mockResolvedValue(1)

    const result = await getMaintenanceJobs()

    expect(result.data).toHaveLength(1)
    expect(result.data.map((job) => job.id)).toEqual(['job-1'])
    expect(prismaMock.maintenanceJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assignedWorkerId: 'worker-profile-1' },
      })
    )
  })

  it('throws for WORKER accessing unassigned job in getMaintenanceJob', async () => {
    // FIXED (T4): worker now throws when accessing jobs not assigned to them.
    mockAssertOwnerOrWorker.mockResolvedValue(
      createMockSession({
        user: {
          id: 'worker-user-1',
          email: 'worker@test.com',
          name: 'Worker',
          role: 'WORKER',
        },
      })
    )

    prismaMock.workerProfile.findUnique.mockResolvedValue({
      id: 'worker-profile-1',
      userId: 'worker-user-1',
    } as never)

    prismaMock.maintenanceJob.findUnique.mockResolvedValue({
      id: 'job-foreign',
      title: 'Not assigned to current worker',
      assignedWorkerId: 'worker-profile-2',
    } as never)

    await expect(getMaintenanceJob('job-foreign')).rejects.toThrow('Unauthorized')
  })

  it('keeps owner full visibility for maintenance jobs', async () => {
    // CURRENT BEHAVIOR: owner visibility is expected and should remain.
    mockAssertOwnerOrWorker.mockResolvedValue(
      createMockSession({
        user: {
          id: 'owner-user-1',
          email: 'owner@test.com',
          name: 'Owner',
          role: 'OWNER',
        },
      })
    )

    prismaMock.maintenanceJob.findMany.mockResolvedValue([
      { id: 'job-1', title: 'Job one' },
      { id: 'job-2', title: 'Job two' },
    ] as never)
    prismaMock.maintenanceJob.count.mockResolvedValue(2)

    const result = await getMaintenanceJobs()

    expect(result.total).toBe(2)
    expect(result.data).toHaveLength(2)
  })

  it('rejects worker quote for job assigned to another worker', async () => {
    // FIXED (T5): ownership check now blocks quoting jobs assigned to other workers
    mockAssertWorker.mockResolvedValue(
      createMockSession({
        user: {
          id: 'worker-user-1',
          email: 'worker@test.com',
          name: 'Worker',
          role: 'WORKER',
        },
      })
    )

    prismaMock.workerProfile.findUnique.mockResolvedValue({
      id: 'worker-profile-1',
      userId: 'worker-user-1',
    } as never)
    prismaMock.maintenanceJob.findUnique.mockResolvedValue({
      id: 'job-owned-by-other-worker',
      title: 'Foreign job',
      status: 'OPEN',
      assignedWorkerId: 'worker-profile-2',
    } as never)

    await expect(
      submitQuote({
        jobId: 'job-owned-by-other-worker',
        amount: 750,
        description: 'Can do this job',
        estimatedDays: 2,
      })
    ).rejects.toThrow('Job already assigned to another worker')
  })
})
