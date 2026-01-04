'use server'

import { prisma } from '@/lib/prisma'
import type { NotificationEvent } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { assertOwner } from '@/lib/auth/guards'

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
