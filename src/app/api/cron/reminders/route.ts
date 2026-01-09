import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendCheckinReminder, sendCheckoutReminder } from '@/lib/notifications'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export const GET = async (request: Request): Promise<NextResponse> => {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
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

  return NextResponse.json({
    checkinReminders: {
      found: checkinBookings.length,
      sent: checkinSent,
    },
    checkoutReminders: {
      found: checkoutBookings.length,
      sent: checkoutSent,
    },
    errors: errors.length > 0 ? errors : undefined,
  })
}
