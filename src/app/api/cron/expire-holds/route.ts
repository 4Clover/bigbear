import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendHoldExpired } from '@/lib/notifications-booking'
import { invalidateBookings, invalidateCalendar } from '@/lib/cache/invalidation'
import { cronRoute } from '@/lib/api/route-gates'

export const dynamic = 'force-dynamic'

export const GET = cronRoute(async () => {
  const now = new Date()

  // Claimed-but-unverified holds (paymentClaimedAt set) are deliberately NOT
  // auto-cancelled — the guest says money is on the way, so the owner resolves
  // them manually (ADR 0001). `lt` never matches a null holdExpiresAt, so
  // legacy STRIPE PENDING bookings are untouched.
  const expiredHolds = await prisma.$transaction(async (tx) => {
    const holds = await tx.booking.findMany({
      where: {
        status: 'PENDING',
        holdExpiresAt: { lt: now },
        paymentClaimedAt: null,
      },
    })

    if (holds.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: holds.map((h) => h.id) } },
        data: {
          status: 'CANCELLED',
          notes: 'Hold expired — payment not received within 24 hours',
        },
      })
    }

    return holds
  })

  let sent = 0
  const errors: string[] = []

  for (const booking of expiredHolds) {
    try {
      await sendHoldExpired(booking)
      sent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Hold-expired notice failed for ${booking.id}: ${message}`)
      console.error(`Hold-expired notice failed for ${booking.id}:`, error)
    }
  }

  if (expiredHolds.length > 0) {
    invalidateBookings()
    invalidateCalendar()
  }

  return NextResponse.json({
    found: expiredHolds.length,
    cancelled: expiredHolds.length,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  })
})
