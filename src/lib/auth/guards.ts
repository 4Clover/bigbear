import { auth } from '@/lib/auth'

export const assertOwner = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertOwnerOrAccountant = async () => {
  const session = await auth()
  if (!session?.user || !['OWNER', 'ACCOUNTANT'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertWorker = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'WORKER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const assertOwnerOrWorker = async () => {
  const session = await auth()
  if (!session?.user || !['OWNER', 'WORKER'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  return session
}
