'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { assertOwner, assertWorker, assertOwnerOrWorker } from '@/lib/auth/guards'
import { auth } from '@/lib/auth'
import { sendQuoteReceived, sendMaintenanceCompleted } from '@/lib/notifications'
import type { JobPriority, JobStatus } from '@prisma/client'
import type { PaginationParams } from '@/types/pagination'
import { DEFAULT_PAGE_SIZE } from '@/types/pagination'
import { env } from '@/lib/env'

const OWNER_EMAIL = env().OWNER_EMAIL

// ============================================================================
// Worker Actions
// ============================================================================

export const getAvailableJobs = async () => {
  await assertWorker()

  return prisma.maintenanceJob.findMany({
    where: { status: 'OPEN' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
}

export const getAssignedJobs = async () => {
  const session = await assertWorker()

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  return prisma.maintenanceJob.findMany({
    where: { assignedWorkerId: workerProfile.id },
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
  })
}

export const getWorkerQuotes = async () => {
  const session = await assertWorker()

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  return prisma.quote.findMany({
    where: { workerId: workerProfile.id },
    include: { job: true },
    orderBy: { submittedAt: 'desc' },
  })
}

export const submitQuote = async (data: {
  jobId: string
  amount: number
  description?: string
  estimatedDays?: number
}) => {
  const session = await assertWorker()

  const schema = z.object({
    jobId: z.string().min(1),
    amount: z.number().positive(),
    description: z.string().optional(),
    estimatedDays: z.number().int().positive().optional(),
  })

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  const job = await prisma.maintenanceJob.findUnique({
    where: { id: validated.data.jobId },
  })

  if (job?.status !== 'OPEN') {
    throw new Error('Job not available for quoting')
  }

  const existingQuote = await prisma.quote.findFirst({
    where: { jobId: validated.data.jobId, workerId: workerProfile.id },
  })

  if (existingQuote) {
    throw new Error('You have already submitted a quote for this job')
  }

  const quote = await prisma.quote.create({
    data: {
      jobId: validated.data.jobId,
      workerId: workerProfile.id,
      amount: validated.data.amount,
      description: validated.data.description,
      estimatedDays: validated.data.estimatedDays,
    },
  })

  await prisma.maintenanceJob.update({
    where: { id: validated.data.jobId },
    data: { status: 'QUOTED' },
  })

  // Send owner notification (non-blocking)
  sendQuoteReceived(job, { ...validated.data, id: quote.id }, OWNER_EMAIL).catch(() => {
    // Notification failure should not affect quote submission
  })

  revalidatePath('/worker/jobs')
  revalidatePath('/worker/quotes')
  revalidatePath('/owner/maintenance')

  return { success: true, quote }
}

export const bookTimeslot = async (data: {
  jobId: string
  scheduledDate: Date
  scheduledTime: string
}) => {
  const session = await assertWorker()

  const schema = z.object({
    jobId: z.string().min(1),
    scheduledDate: z.coerce.date(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  })

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  const job = await prisma.maintenanceJob.findUnique({
    where: { id: validated.data.jobId },
  })

  if (job?.assignedWorkerId !== workerProfile.id) {
    throw new Error('Job not assigned to you')
  }

  if (job.status !== 'ASSIGNED') {
    throw new Error('Job is not in a state that can be scheduled')
  }

  const updatedJob = await prisma.maintenanceJob.update({
    where: { id: validated.data.jobId },
    data: {
      scheduledDate: validated.data.scheduledDate,
      scheduledTime: validated.data.scheduledTime,
      status: 'SCHEDULED',
    },
  })

  revalidatePath('/worker/schedule')
  revalidatePath('/worker/jobs')
  revalidatePath('/owner/maintenance')

  return { success: true, job: updatedJob }
}

export const submitWorkCompletion = async (data: {
  jobId: string
  description?: string
  images: string[]
  hoursWorked?: number
  materialsUsed?: string
  unexpectedIssues?: string
  finalAmount?: number
}) => {
  const session = await assertWorker()

  const schema = z.object({
    jobId: z.string().min(1),
    description: z.string().optional(),
    images: z.array(z.url()),
    hoursWorked: z.number().positive().optional(),
    materialsUsed: z.string().optional(),
    unexpectedIssues: z.string().optional(),
    finalAmount: z.number().nonnegative().optional(),
  })

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  const job = await prisma.maintenanceJob.findUnique({
    where: { id: validated.data.jobId },
  })

  if (job?.assignedWorkerId !== workerProfile.id) {
    throw new Error('Job not assigned to you')
  }

  if (!['SCHEDULED', 'IN_PROGRESS'].includes(job.status)) {
    throw new Error('Job is not in a state that can be completed')
  }

  const completion = await prisma.workCompletion.create({
    data: {
      jobId: validated.data.jobId,
      workerId: workerProfile.id,
      description: validated.data.description,
      images: validated.data.images,
      hoursWorked: validated.data.hoursWorked,
      materialsUsed: validated.data.materialsUsed,
      unexpectedIssues: validated.data.unexpectedIssues,
      finalAmount: validated.data.finalAmount,
    },
  })

  await prisma.maintenanceJob.update({
    where: { id: validated.data.jobId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })

  // Send owner notification (non-blocking)
  sendMaintenanceCompleted(
    job,
    { id: completion.id, finalAmount: validated.data.finalAmount, description: validated.data.description },
    OWNER_EMAIL
  ).catch(() => {
    // Notification failure should not affect work completion
  })

  revalidatePath('/worker/jobs')
  revalidatePath('/owner/maintenance')

  return { success: true, completion }
}

export const startWork = async (jobId: string) => {
  const session = await assertWorker()

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!workerProfile) {
    throw new Error('Worker profile not found')
  }

  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
  })

  if (job?.assignedWorkerId !== workerProfile.id) {
    throw new Error('Job not assigned to you')
  }

  if (job.status !== 'SCHEDULED') {
    throw new Error('Job must be scheduled before starting')
  }

  const updatedJob = await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: { status: 'IN_PROGRESS' },
  })

  revalidatePath('/worker/jobs')
  revalidatePath('/owner/maintenance')

  return { success: true, job: updatedJob }
}

// ============================================================================
// Owner Actions
// ============================================================================

export const createMaintenanceJob = async (data: {
  title: string
  description?: string
  priority?: JobPriority
  dueDate?: Date
  images?: string[]
  notes?: string
}) => {
  await assertOwner()

  const job = await prisma.maintenanceJob.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority ?? 'MEDIUM',
      dueDate: data.dueDate,
      images: data.images ?? [],
      notes: data.notes,
    },
  })

  revalidatePath('/owner/maintenance')
  return { success: true, job }
}

export const getMaintenanceJobs = async (
  filters?: {
    status?: JobStatus
    priority?: JobPriority
    search?: string
  },
  pagination: PaginationParams = {}
) => {
  await assertOwnerOrWorker()

  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination
  const where: Record<string, unknown> = {}

  if (filters?.status) where.status = filters.status
  if (filters?.priority) where.priority = filters.priority
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [jobs, total] = await Promise.all([
    prisma.maintenanceJob.findMany({
      where,
      include: {
        quotes: {
          include: { worker: { include: { user: true } } },
        },
        workCompletions: {
          include: { worker: { include: { user: true } } },
        },
        assignedWorker: {
          include: { user: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.maintenanceJob.count({ where }),
  ])

  return {
    data: jobs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getMaintenanceJob = async (jobId: string) => {
  await assertOwnerOrWorker()

  return prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    include: {
      quotes: {
        include: { worker: { include: { user: true } } },
      },
      workCompletions: {
        include: { worker: { include: { user: true } } },
      },
      assignedWorker: {
        include: { user: true },
      },
    },
  })
}

export const acceptQuote = async (quoteId: string) => {
  await assertOwner()

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { job: true },
  })

  if (!quote) {
    throw new Error('Quote not found')
  }

  if (quote.job.status !== 'QUOTED') {
    throw new Error('Job is not in quoted state')
  }

  await prisma.$transaction([
    prisma.quote.update({
      where: { id: quoteId },
      data: { isApproved: true },
    }),
    prisma.maintenanceJob.update({
      where: { id: quote.jobId },
      data: {
        status: 'ASSIGNED',
        assignedWorkerId: quote.workerId,
      },
    }),
  ])

  revalidatePath('/owner/maintenance')
  revalidatePath('/worker/jobs')
  revalidatePath('/worker/quotes')

  return { success: true }
}

export const approveWorkCompletion = async (completionId: string) => {
  await assertOwner()

  const completion = await prisma.workCompletion.findUnique({
    where: { id: completionId },
    include: { job: true },
  })

  if (!completion) {
    throw new Error('Work completion not found')
  }

  if (completion.job.status !== 'COMPLETED') {
    throw new Error('Job is not in completed state')
  }

  await prisma.$transaction([
    prisma.workCompletion.update({
      where: { id: completionId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
      },
    }),
    prisma.maintenanceJob.update({
      where: { id: completion.jobId },
      data: { status: 'APPROVED' },
    }),
  ])

  revalidatePath('/owner/maintenance')
  revalidatePath('/worker/jobs')

  return { success: true }
}

export const markWorkerPaid = async (completionId: string) => {
  await assertOwner()

  const completion = await prisma.workCompletion.findUnique({
    where: { id: completionId },
    include: { job: true },
  })

  if (!completion) {
    throw new Error('Work completion not found')
  }

  if (completion.job.status !== 'APPROVED') {
    throw new Error('Work must be approved before marking as paid')
  }

  await prisma.$transaction([
    prisma.workCompletion.update({
      where: { id: completionId },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    }),
    prisma.maintenanceJob.update({
      where: { id: completion.jobId },
      data: { status: 'PAID' },
    }),
  ])

  revalidatePath('/owner/maintenance')
  return { success: true }
}

export const cancelJob = async (jobId: string) => {
  await assertOwner()

  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    throw new Error('Job not found')
  }

  if (['COMPLETED', 'APPROVED', 'PAID'].includes(job.status)) {
    throw new Error('Cannot cancel a completed job')
  }

  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/owner/maintenance')
  return { success: true }
}

export const getWorkers = async () => {
  await assertOwner()

  return prisma.workerProfile.findMany({
    include: {
      user: true,
      _count: {
        select: {
          quotes: true,
          workCompletions: true,
          assignedJobs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export const updateWorkerProfile = async (
  workerId: string,
  data: {
    trustworthiness?: number
    notes?: string
    isActive?: boolean
  }
) => {
  await assertOwner()

  const worker = await prisma.workerProfile.update({
    where: { id: workerId },
    data,
  })

  revalidatePath('/owner/maintenance')
  return { success: true, worker }
}

export const inviteWorker = async (data: {
  email: string
  name: string
  businessName?: string
  phoneNumber?: string
  services?: string[]
}) => {
  await assertOwner()

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: 'WORKER',
      workerProfile: {
        create: {
          businessName: data.businessName,
          phoneNumber: data.phoneNumber,
          services: data.services ?? [],
        },
      },
    },
    include: { workerProfile: true },
  })

  revalidatePath('/owner/maintenance')
  return { success: true, user }
}

// ============================================================================
// Shared Actions
// ============================================================================

export const getWorkerProfile = async () => {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      _count: {
        select: {
          quotes: true,
          workCompletions: true,
          assignedJobs: true,
        },
      },
    },
  })
}
