'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

const assertOwner = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const blockDates = async (
  startDate: Date,
  endDate: Date,
  reason?: string,
  _notes?: string
) => {
  await assertOwner()

  await prisma.blockedDate.create({
    data: {
      startDate,
      endDate,
      reason,
      source: 'manual',
    },
  })

  revalidatePath('/owner/calendar')
  return { success: true }
}

export const unblockDates = async (blockedDateId: string) => {
  await assertOwner()

  await prisma.blockedDate.delete({
    where: { id: blockedDateId },
  })

  revalidatePath('/owner/calendar')
  return { success: true }
}

export const addCalendarSync = async (name: string, icalUrl: string) => {
  await assertOwner()

  await prisma.calendarSync.create({
    data: {
      name,
      icalUrl,
      isActive: true,
    },
  })

  revalidatePath('/owner/calendar')
  return { success: true }
}

export const removeCalendarSync = async (syncId: string) => {
  await assertOwner()

  await prisma.calendarSync.delete({
    where: { id: syncId },
  })

  revalidatePath('/owner/calendar')
  return { success: true }
}

export const toggleCalendarSync = async (syncId: string, isActive: boolean) => {
  await assertOwner()

  await prisma.calendarSync.update({
    where: { id: syncId },
    data: { isActive },
  })

  revalidatePath('/owner/calendar')
  return { success: true }
}
