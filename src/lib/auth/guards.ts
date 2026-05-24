import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'
import type { UserRole } from '@prisma/client'

export const assertOwner = async (): Promise<Session> => {
  const session = await auth()
  const role = session?.user.role
  if (!role || role !== 'OWNER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertOwnerOrAccountant = async (): Promise<Session> => {
  const session = await auth()
  const role = session?.user.role
  if (!role || !(['OWNER', 'ACCOUNTANT'] as UserRole[]).includes(role)) {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertWorker = async (): Promise<Session> => {
  const session = await auth()
  const role = session?.user.role
  if (!role || role !== 'WORKER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertOwnerOrWorker = async (): Promise<Session> => {
  const session = await auth()
  const role = session?.user.role
  if (!role || !(['OWNER', 'WORKER'] as UserRole[]).includes(role)) {
    throw new Error('Unauthorized')
  }
  return session
}
