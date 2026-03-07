import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendCheckinReminder,
  sendCheckoutReminder,
  sendGalleryUploadInvite,
} from '@/lib/notifications'
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { cronRoute } from '@/lib/api/route-gates'

export const dynamic = 'force-dynamic'

export const GET = cronRoute(async () => {
  const tomorrow = addDays(new Date(), 1)
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  // Find bookings with check-in tomorrow
  const checkinBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      checkIn: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
  })

  // Find bookings with check-out tomorrow
  const checkoutBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      checkOut: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
  })

  // Batch dedup: fetch all previously sent reminders in 3 queries instead of N per booking
  const [sentCheckinRecipients, sentCheckoutRecipients, sentGalleryRecipients] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { event: 'GUEST_CHECKIN_REMINDER' },
      select: { recipient: true },
    }),
    prisma.notificationLog.findMany({
      where: { event: 'GUEST_CHECKOUT_REMINDER' },
      select: { recipient: true },
    }),
    prisma.notificationLog.findMany({
      where: { event: 'GALLERY_INVITE' },
      select: { recipient: true },
    }),
  ])

  const sentCheckinReminders = new Set(sentCheckinRecipients.map((log) => log.recipient))
  const sentCheckoutReminders = new Set(sentCheckoutRecipients.map((log) => log.recipient))
  const sentGalleryInvites = new Set(sentGalleryRecipients.map((log) => log.recipient))

  let checkinSent = 0
  let checkoutSent = 0
  const errors: string[] = []

  // Send check-in reminders (dedup by recipient)
  for (const booking of checkinBookings) {
    if (sentCheckinReminders.has(booking.guestEmail)) continue
    try {
      await sendCheckinReminder(booking)
      checkinSent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Check-in reminder failed for ${booking.id}: ${message}`)
      console.error(`Check-in reminder failed for ${booking.id}:`, error)
    }
  }

  // Send check-out reminders (dedup by recipient)
  for (const booking of checkoutBookings) {
    if (sentCheckoutReminders.has(booking.guestEmail)) continue
    try {
      await sendCheckoutReminder(booking)
      checkoutSent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Check-out reminder failed for ${booking.id}: ${message}`)
      console.error(`Check-out reminder failed for ${booking.id}:`, error)
    }
  }

  let galleryInvitesSent = 0
  let galleryInvitesFound = 0
  const galleryErrors: string[] = []

  try {
    const yesterday = subDays(new Date(), 1)
    const yesterdayStart = startOfDay(yesterday)
    const yesterdayEnd = endOfDay(yesterday)

    const completedBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        checkOut: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    })
    galleryInvitesFound = completedBookings.length

    for (const booking of completedBookings) {
      if (sentGalleryInvites.has(booking.guestEmail)) continue

      try {
        await sendGalleryUploadInvite(booking)
        galleryInvitesSent++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        galleryErrors.push(`Gallery invite failed for ${booking.id}: ${message}`)
        console.error(`Gallery invite failed for ${booking.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Gallery invite cron failed:', error)
    galleryErrors.push(
      `Gallery invite batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  const allErrors = [...errors, ...galleryErrors]

  return NextResponse.json({
    checkinReminders: {
      found: checkinBookings.length,
      sent: checkinSent,
    },
    checkoutReminders: {
      found: checkoutBookings.length,
      sent: checkoutSent,
    },
    galleryInvites: {
      found: galleryInvitesFound,
      sent: galleryInvitesSent,
    },
    errors: allErrors.length > 0 ? allErrors : undefined,
  })
})
