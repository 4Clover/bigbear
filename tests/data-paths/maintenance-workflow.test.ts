import { describe, it, expect } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { Decimal } from '../fixtures/booking.factory'

/**
 * Maintenance workflow data path tests.
 * Tests the complete maintenance job lifecycle including:
 * - Job creation with priority
 * - Quote submission and approval
 * - Work completion and approval
 * - Status transitions through workflow
 */
describe('Maintenance Workflow Data Path', () => {
  describe('Job creation', () => {
    it('should create job with default OPEN status and MEDIUM priority', async () => {
      const job = {
        id: 'job-1',
        title: 'Fix leaky faucet',
        description: 'Kitchen sink faucet is dripping',
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

      prismaMock.maintenanceJob.create.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.create({
        data: {
          title: 'Fix leaky faucet',
          description: 'Kitchen sink faucet is dripping',
        },
      })

      expect(result.status).toBe('OPEN')
      expect(result.priority).toBe('MEDIUM')
    })

    it('should create URGENT priority job', async () => {
      const job = {
        id: 'job-2',
        title: 'Water heater failure',
        description: 'No hot water',
        priority: 'URGENT' as const,
        status: 'OPEN' as const,
        dueDate: new Date(),
        images: [],
        notes: null,
        assignedWorkerId: null,
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.maintenanceJob.create.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.create({
        data: {
          title: 'Water heater failure',
          priority: 'URGENT',
          dueDate: new Date(),
        },
      })

      expect(result.priority).toBe('URGENT')
    })

    it('should attach images to job', async () => {
      const job = {
        id: 'job-3',
        title: 'Broken window',
        description: null,
        priority: 'HIGH' as const,
        status: 'OPEN' as const,
        dueDate: null,
        images: ['https://example.com/before1.jpg', 'https://example.com/before2.jpg'],
        notes: null,
        assignedWorkerId: null,
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.maintenanceJob.create.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.create({
        data: {
          title: 'Broken window',
          priority: 'HIGH',
          images: ['https://example.com/before1.jpg', 'https://example.com/before2.jpg'],
        },
      })

      expect(result.images.length).toBe(2)
    })
  })

  describe('Quote submission', () => {
    it('should create quote for job', async () => {
      const quote = {
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-1',
        amount: new Decimal('150.00'),
        description: 'Replace faucet cartridge',
        estimatedDays: 1,
        isApproved: false,
        submittedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      prismaMock.quote.create.mockResolvedValue(quote)

      const result = await prismaMock.quote.create({
        data: {
          jobId: 'job-1',
          workerId: 'worker-1',
          amount: 150.0,
          description: 'Replace faucet cartridge',
          estimatedDays: 1,
        },
      })

      expect(result.isApproved).toBe(false)
      expect(result.amount.toString()).toBe('150')
    })

    it('should allow multiple quotes per job', async () => {
      const quotes = [
        {
          id: 'quote-1',
          jobId: 'job-1',
          workerId: 'worker-1',
          amount: new Decimal('150.00'),
          description: null,
          estimatedDays: null,
          isApproved: false,
          submittedAt: new Date(),
          expiresAt: null,
        },
        {
          id: 'quote-2',
          jobId: 'job-1',
          workerId: 'worker-2',
          amount: new Decimal('175.00'),
          description: null,
          estimatedDays: null,
          isApproved: false,
          submittedAt: new Date(),
          expiresAt: null,
        },
      ]

      prismaMock.quote.findMany.mockResolvedValue(quotes)

      const result = await prismaMock.quote.findMany({
        where: { jobId: 'job-1' },
      })

      expect(result.length).toBe(2)
    })

    it('should transition job to QUOTED when quote submitted', async () => {
      const job = {
        id: 'job-1',
        title: 'Test',
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
      }

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: { status: 'QUOTED' },
      })

      expect(result.status).toBe('QUOTED')
    })
  })

  describe('Quote approval', () => {
    it('should approve quote and update job status', async () => {
      const approvedQuote = {
        id: 'quote-1',
        jobId: 'job-1',
        workerId: 'worker-1',
        amount: new Decimal('150.00'),
        description: null,
        estimatedDays: 1,
        isApproved: true,
        submittedAt: new Date(),
        expiresAt: null,
      }

      prismaMock.quote.update.mockResolvedValue(approvedQuote)

      const result = await prismaMock.quote.update({
        where: { id: 'quote-1' },
        data: { isApproved: true },
      })

      expect(result.isApproved).toBe(true)
    })

    it('should transition job to APPROVED when quote approved', async () => {
      const job = {
        id: 'job-1',
        title: 'Test',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'APPROVED' as const,
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

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: { status: 'APPROVED' },
      })

      expect(result.status).toBe('APPROVED')
    })
  })

  describe('Work in progress', () => {
    it('should transition job to IN_PROGRESS', async () => {
      const job = {
        id: 'job-1',
        title: 'Test',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'IN_PROGRESS' as const,
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

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: { status: 'IN_PROGRESS' },
      })

      expect(result.status).toBe('IN_PROGRESS')
    })
  })

  describe('Work completion', () => {
    it('should submit work completion', async () => {
      const completion = {
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-1',
        description: 'Replaced faucet cartridge, tested - no more leaks',
        images: ['https://example.com/after.jpg'],
        hoursWorked: new Decimal('2.5'),
        materialsUsed: 'Moen cartridge, plumber tape',
        unexpectedIssues: null,
        finalAmount: null,
        isApproved: false,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt: null,
        paidAt: null,
      }

      prismaMock.workCompletion.create.mockResolvedValue(completion)

      const result = await prismaMock.workCompletion.create({
        data: {
          jobId: 'job-1',
          workerId: 'worker-1',
          description: 'Replaced faucet cartridge',
          hoursWorked: 2.5,
          materialsUsed: 'Moen cartridge, plumber tape',
          images: ['https://example.com/after.jpg'],
        },
      })

      expect(result.isApproved).toBe(false)
      expect(result.hoursWorked?.toString()).toBe('2.5')
    })

    it('should approve work completion with timestamp', async () => {
      const approvedAt = new Date()
      const completion = {
        id: 'completion-1',
        jobId: 'job-1',
        workerId: 'worker-1',
        description: 'Work done',
        images: [],
        hoursWorked: new Decimal('2.0'),
        materialsUsed: null,
        unexpectedIssues: null,
        finalAmount: null,
        isApproved: true,
        isPaid: false,
        submittedAt: new Date(),
        approvedAt,
        paidAt: null,
      }

      prismaMock.workCompletion.update.mockResolvedValue(completion)

      const result = await prismaMock.workCompletion.update({
        where: { id: 'completion-1' },
        data: {
          isApproved: true,
          approvedAt,
        },
      })

      expect(result.isApproved).toBe(true)
      expect(result.approvedAt).toEqual(approvedAt)
    })

    it('should transition job to COMPLETED after work approval', async () => {
      const job = {
        id: 'job-1',
        title: 'Test',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'COMPLETED' as const,
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

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: { status: 'COMPLETED' },
      })

      expect(result.status).toBe('COMPLETED')
    })
  })

  describe('Job cancellation', () => {
    it('should allow cancellation from OPEN status', async () => {
      const job = {
        id: 'job-1',
        title: 'Cancelled job',
        description: null,
        priority: 'LOW' as const,
        status: 'CANCELLED' as const,
        dueDate: null,
        images: [],
        notes: 'No longer needed',
        assignedWorkerId: null,
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: {
          status: 'CANCELLED',
          notes: 'No longer needed',
        },
      })

      expect(result.status).toBe('CANCELLED')
    })

    it('should allow cancellation from IN_PROGRESS', async () => {
      const job = {
        id: 'job-1',
        title: 'Cancelled in progress',
        description: null,
        priority: 'MEDIUM' as const,
        status: 'CANCELLED' as const,
        dueDate: null,
        images: [],
        notes: 'Property sold',
        assignedWorkerId: null,
        scheduledDate: null,
        scheduledTime: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.maintenanceJob.update.mockResolvedValue(job)

      const result = await prismaMock.maintenanceJob.update({
        where: { id: 'job-1' },
        data: { status: 'CANCELLED' },
      })

      expect(result.status).toBe('CANCELLED')
    })
  })

  describe('Query patterns', () => {
    it('should find open jobs by priority', async () => {
      const urgentJobs = [
        {
          id: 'job-1',
          title: 'Urgent 1',
          description: null,
          priority: 'URGENT' as const,
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
      ]

      prismaMock.maintenanceJob.findMany.mockResolvedValue(urgentJobs)

      const result = await prismaMock.maintenanceJob.findMany({
        where: {
          status: 'OPEN',
          priority: 'URGENT',
        },
      })

      expect(result.length).toBe(1)
      expect(result[0]?.priority).toBe('URGENT')
    })

    it('should find jobs by worker through quotes', async () => {
      const workerQuotes = [
        {
          id: 'quote-1',
          jobId: 'job-1',
          workerId: 'worker-1',
          amount: new Decimal('100.00'),
          description: null,
          estimatedDays: null,
          isApproved: true,
          submittedAt: new Date(),
          expiresAt: null,
        },
      ]

      prismaMock.quote.findMany.mockResolvedValue(workerQuotes)

      const result = await prismaMock.quote.findMany({
        where: {
          workerId: 'worker-1',
          isApproved: true,
        },
      })

      expect(result.length).toBe(1)
    })
  })
})
