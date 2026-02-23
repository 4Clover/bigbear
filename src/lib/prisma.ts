import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { env } from './env'

const getConnectionString = (): string => {
  const connectionString = env().DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return connectionString
}

// Recursively convert Decimal fields to numbers for client component serialization
const convertDecimals = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Prisma.Decimal) return Number(obj) as T
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(convertDecimals) as T
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDecimals(value)
    }
    return converted as T
  }
  return obj
}

const createPrismaClient = () => {
  const adapter = new PrismaNeon({ connectionString: getConnectionString() })
  const client = new PrismaClient({ adapter })

  // Extend client to auto-convert Decimal to number in all query results
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const result = await query(args)
          return convertDecimals(result)
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
