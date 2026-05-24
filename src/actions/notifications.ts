'use server'

import { prisma } from '@/lib/prisma'
import type { NotificationEvent } from '@prisma/client'
import { invalidateNotifications } from '@/lib/cache/invalidation'
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

  invalidateNotifications()
  return { success: true }
}
