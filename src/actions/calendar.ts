'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { assertOwner } from '@/lib/auth/guards'
import { validateExternalUrl } from '@/lib/security'

export const blockDates = async (
  startDate: Date,
  endDate: Date,
  reason?: string,
  notes?: string
) => {
  await assertOwner()

  const schema = z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => data.endDate >= data.startDate, {
      message: 'End date must be after start date',
      path: ['endDate'],
    })

  const validated = schema.safeParse({ startDate, endDate, reason, notes })
  if (!validated.success) {
    return { errors: z.treeifyError(validated.error).properties }
  }

  await prisma.blockedDate.create({
    data: {
      startDate: validated.data.startDate,
      endDate: validated.data.endDate,
      reason: validated.data.reason,
      notes: validated.data.notes,
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

  // Validate URL to prevent SSRF attacks
  validateExternalUrl(icalUrl)

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
