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

  it('returns all jobs for WORKER in getMaintenanceJobs', async () => {
    // BUG: worker sees all jobs, will be fixed in T4.
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

    prismaMock.maintenanceJob.findMany.mockResolvedValue([
      { id: 'job-1', title: 'Worker-owned', assignedWorkerId: 'worker-profile-1' },
      { id: 'job-2', title: 'Someone else job', assignedWorkerId: 'worker-profile-2' },
    ] as never)
    prismaMock.maintenanceJob.count.mockResolvedValue(2)

    const result = await getMaintenanceJobs()

    expect(result.data).toHaveLength(2)
    expect(result.data.map((job) => job.id)).toEqual(['job-1', 'job-2'])
    expect(prismaMock.maintenanceJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })

  it('returns job by id for WORKER without ownership checks in getMaintenanceJob', async () => {
    // BUG: unfiltered worker access in getMaintenanceJob.
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

    prismaMock.maintenanceJob.findUnique.mockResolvedValue({
      id: 'job-foreign',
      title: 'Not assigned to current worker',
      assignedWorkerId: 'worker-profile-2',
    } as never)

    const result = await getMaintenanceJob('job-foreign')

    expect(result?.id).toBe('job-foreign')
    expect(prismaMock.maintenanceJob.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'job-foreign' } })
    )
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
