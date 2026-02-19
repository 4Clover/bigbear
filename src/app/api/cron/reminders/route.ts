import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendCheckinReminder,
  sendCheckoutReminder,
  sendGalleryUploadInvite,
} from '@/lib/notifications'
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request): Promise<NextResponse> => {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = env().CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  let checkinSent = 0
  let checkoutSent = 0
  const errors: string[] = []

  // Send check-in reminders
  for (const booking of checkinBookings) {
    try {
      await sendCheckinReminder(booking)
      checkinSent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Check-in reminder failed for ${booking.id}: ${message}`)
      console.error(`Check-in reminder failed for ${booking.id}:`, error)
    }
  }

  // Send check-out reminders
  for (const booking of checkoutBookings) {
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
      const alreadySent = await prisma.notificationLog.findFirst({
        where: {
          event: 'GALLERY_INVITE',
          recipient: booking.guestEmail,
        },
      })
      if (alreadySent) continue

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
}
