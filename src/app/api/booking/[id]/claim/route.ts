import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyPaymentClaimToken } from '@/lib/payment-claim-token'
import { invalidateBookings } from '@/lib/cache/invalidation'

const ClaimRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const clientId = getClientIdentifier(request)
  const rateLimitResult = await checkRateLimit(`booking-claim:${clientId}`, RATE_LIMITS.contact)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const { id } = await params
    const rawBody: unknown = await request.json()

    const parseResult = ClaimRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    let payload
    try {
      payload = await verifyPaymentClaimToken(parseResult.data.token)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
    }

    if (payload.bookingId !== id) {
      return NextResponse.json({ error: 'Link does not match this booking' }, { status: 403 })
    }

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (payload.guestEmail !== booking.guestEmail) {
      return NextResponse.json({ error: 'Link does not match this booking' }, { status: 403 })
    }

    if (booking.paymentClaimedAt !== null) {
      return NextResponse.json({ success: true, alreadyClaimed: true })
    }

    // Guarded atomic write — only a live PENDING hold can be claimed; the
    // where clause re-checks status and expiry so a racing cron/cancel can't
    // be overwritten.
    const now = new Date()
    const result = await prisma.booking.updateMany({
      where: { id, status: 'PENDING', holdExpiresAt: { gt: now } },
      data: { paymentClaimedAt: now },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'This hold has expired or is no longer pending' },
        { status: 409 }
      )
    }

    invalidateBookings()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment claim error:', error)
    return NextResponse.json({ error: 'Failed to record claim' }, { status: 500 })
  }
}
