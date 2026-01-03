'use server'

import { prisma } from '@/lib/prisma'
import type { NotificationEvent } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

const assertOwner = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const updateNotificationPreference = async (
  event: NotificationEvent,
  emailEnabled: boolean,
  smsEnabled: boolean
) => {
  await assertOwner()

  await prisma.notificationPreference.upsert({
    where: { event },
    update: { emailEnabled, smsEnabled },
    create: { event, emailEnabled, smsEnabled },
  })

  revalidatePath('/owner/settings')
  return { success: true }
}

export const getNotificationPreferences = async () => {
  await assertOwner()

  const preferences = await prisma.notificationPreference.findMany({
    orderBy: { event: 'asc' },
  })

  return preferences
}
