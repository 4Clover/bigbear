import type { MaintenanceJob, JobPriority, JobStatus } from '@prisma/client'

let jobCounter = 0

export const createMaintenanceJobFixture = (
  overrides: Partial<MaintenanceJob> = {}
): MaintenanceJob => {
  jobCounter++
  const now = new Date()

  return {
    id: `job-${jobCounter}`,
    title: `Test Job ${jobCounter}`,
    description: null,
    priority: 'MEDIUM' as JobPriority,
    status: 'OPEN' as JobStatus,
    dueDate: null,
    images: [],
    notes: null,
    assignedWorkerId: null,
    scheduledDate: null,
    scheduledTime: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const resetJobCounter = (): void => {
  jobCounter = 0
}
