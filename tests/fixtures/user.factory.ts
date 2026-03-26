import type { User, UserRole, WorkerProfile } from '@prisma/client'

let userCounter = 0

export const createUserFixture = (overrides: Partial<User> = {}): User => {
  userCounter++
  const now = new Date()

  return {
    id: `user-${userCounter}`,
    name: `User ${userCounter}`,
    email: `user${userCounter}@example.com`,
    emailVerified: null,
    image: null,
    phone: null,
    role: 'GUEST' as UserRole,
    isFamilyMember: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const createOwnerFixture = (overrides: Partial<User> = {}): User => {
  return createUserFixture({ role: 'OWNER' as UserRole, ...overrides })
}

export const createWorkerFixture = (overrides: Partial<User> = {}): User => {
  return createUserFixture({ role: 'WORKER' as UserRole, ...overrides })
}

export const createWorkerProfileFixture = (
  userId: string,
  overrides: Partial<WorkerProfile> = {}
): WorkerProfile => {
  const now = new Date()

  return {
    id: `worker-profile-${userId}`,
    userId,
    businessName: null,
    services: [],
    phoneNumber: null,
    address: null,
    taxId: null,
    isActive: true,
    trustworthiness: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const resetUserCounter = (): void => {
  userCounter = 0
}
