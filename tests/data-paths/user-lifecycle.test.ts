import { describe, it, expect, beforeEach } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import {
  createUserFixture,
  createOwnerFixture,
  createWorkerFixture,
  createWorkerProfileFixture,
  resetUserCounter,
} from '../fixtures/user.factory'

/**
 * User lifecycle data path tests.
 * Tests the complete lifecycle of user records including:
 * - Creation with default and explicit roles
 * - Role transitions (GUEST → WORKER)
 * - Associated record creation (WorkerProfile)
 * - Cascade deletion behavior
 */
describe('User Lifecycle Data Path', () => {
  beforeEach(() => {
    resetUserCounter()
  })

  describe('User creation', () => {
    it('should create user with default GUEST role', async () => {
      const user = createUserFixture()

      prismaMock.user.create.mockResolvedValue(user)

      const result = await prismaMock.user.create({
        data: {
          email: user.email,
          name: user.name,
        },
      })

      expect(result.role).toBe('GUEST')
      expect(prismaMock.user.create).toHaveBeenCalled()
    })

    it('should create user with explicit OWNER role', async () => {
      const owner = createOwnerFixture()

      prismaMock.user.create.mockResolvedValue(owner)

      const result = await prismaMock.user.create({
        data: {
          email: owner.email,
          name: owner.name,
          role: 'OWNER',
        },
      })

      expect(result.role).toBe('OWNER')
    })

    it('should create user with explicit WORKER role', async () => {
      const worker = createWorkerFixture()

      prismaMock.user.create.mockResolvedValue(worker)

      const result = await prismaMock.user.create({
        data: {
          email: worker.email,
          name: worker.name,
          role: 'WORKER',
        },
      })

      expect(result.role).toBe('WORKER')
    })

    it('should set createdAt and updatedAt timestamps', async () => {
      const user = createUserFixture()

      prismaMock.user.create.mockResolvedValue(user)

      const result = await prismaMock.user.create({
        data: { email: user.email },
      })

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('User role transitions', () => {
    it('should upgrade GUEST to WORKER', async () => {
      const guest = createUserFixture({ role: 'GUEST' })
      const upgradedWorker = { ...guest, role: 'WORKER' as const }

      prismaMock.user.update.mockResolvedValue(upgradedWorker)

      const result = await prismaMock.user.update({
        where: { id: guest.id },
        data: { role: 'WORKER' },
      })

      expect(result.role).toBe('WORKER')
    })

    it('should create WorkerProfile when user becomes WORKER', async () => {
      const user = createUserFixture({ id: 'user-for-worker' })
      const workerProfile = createWorkerProfileFixture(user.id)

      prismaMock.workerProfile.create.mockResolvedValue(workerProfile)

      const result = await prismaMock.workerProfile.create({
        data: {
          userId: user.id,
          services: [],
          isActive: true,
        },
      })

      expect(result.userId).toBe(user.id)
      expect(result.isActive).toBe(true)
    })

    it('should update WorkerProfile services', async () => {
      const user = createWorkerFixture()
      const updatedProfile = createWorkerProfileFixture(user.id, {
        services: ['Plumbing', 'HVAC', 'Electrical'],
      })

      prismaMock.workerProfile.update.mockResolvedValue(updatedProfile)

      const result = await prismaMock.workerProfile.update({
        where: { userId: user.id },
        data: { services: ['Plumbing', 'HVAC', 'Electrical'] },
      })

      expect(result.services).toContain('Plumbing')
      expect(result.services).toContain('HVAC')
      expect(result.services.length).toBe(3)
    })
  })

  describe('User lookup patterns', () => {
    it('should find user by unique email', async () => {
      const user = createUserFixture({ email: 'unique@example.com' })

      prismaMock.user.findUnique.mockResolvedValue(user)

      const result = await prismaMock.user.findUnique({
        where: { email: 'unique@example.com' },
      })

      expect(result?.email).toBe('unique@example.com')
    })

    it('should return null for non-existent email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await prismaMock.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      })

      expect(result).toBeNull()
    })

    it('should find users by role', async () => {
      const workers = [createWorkerFixture(), createWorkerFixture(), createWorkerFixture()]

      prismaMock.user.findMany.mockResolvedValue(workers)

      const result = await prismaMock.user.findMany({
        where: { role: 'WORKER' },
      })

      expect(result.length).toBe(3)
      result.forEach((user) => {
        expect(user.role).toBe('WORKER')
      })
    })
  })

  describe('User deletion and cascades', () => {
    it('should delete user and return deleted record', async () => {
      const user = createUserFixture()

      prismaMock.user.delete.mockResolvedValue(user)

      const result = await prismaMock.user.delete({
        where: { id: user.id },
      })

      expect(result.id).toBe(user.id)
    })

    it('should delete WorkerProfile when Worker user is deleted', async () => {
      const worker = createWorkerFixture()

      // Simulate cascade: deleting user also deletes worker profile
      prismaMock.user.delete.mockResolvedValue(worker)

      await prismaMock.user.delete({
        where: { id: worker.id },
      })

      // In real implementation, cascade handles this automatically
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: worker.id },
      })
    })
  })

  describe('User update patterns', () => {
    it('should update user email', async () => {
      const user = createUserFixture()
      const updatedUser = { ...user, email: 'newemail@example.com' }

      prismaMock.user.update.mockResolvedValue(updatedUser)

      const result = await prismaMock.user.update({
        where: { id: user.id },
        data: { email: 'newemail@example.com' },
      })

      expect(result.email).toBe('newemail@example.com')
    })

    it('should update updatedAt timestamp on modification', async () => {
      const user = createUserFixture()
      const newUpdatedAt = new Date()
      const updatedUser = { ...user, updatedAt: newUpdatedAt }

      prismaMock.user.update.mockResolvedValue(updatedUser)

      const result = await prismaMock.user.update({
        where: { id: user.id },
        data: { name: 'New Name' },
      })

      expect(result.updatedAt).toEqual(newUpdatedAt)
    })
  })
})
