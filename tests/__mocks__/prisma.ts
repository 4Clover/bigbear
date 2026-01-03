import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended'

export type MockPrismaClient = DeepMockProxy<PrismaClient>

export const createMockPrismaClient = (): MockPrismaClient => {
  return mockDeep<PrismaClient>()
}

// Singleton mock for module replacement
export const prismaMock = createMockPrismaClient()

// For vi.mock('@/lib/prisma')
export const prisma = prismaMock
export default prismaMock
