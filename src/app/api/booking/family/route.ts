import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyFamilyToken } from '@/lib/family-token'
import { invalidateBookings, invalidateCalendar } from '@/lib/cache/invalidation'

const schema = z.object({
  token: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guestName: z.string().min(1),
  guestEmail: z.email(),
  guestPhone: z.string().optional(),
  numberOfGuests: z.number().int().min(1).default(1),
})

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { token, checkIn, checkOut, guestName, guestEmail, guestPhone, numberOfGuests } =
      parsed.data

    // Verify family token
    let payload
    try {
      payload = await verifyFamilyToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired family link' }, { status: 401 })
    }

    // Verify email matches token
    if (payload.email !== guestEmail) {
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 403 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Find or create guest user
    let user = await prisma.user.findUnique({ where: { email: guestEmail } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: guestEmail,
          name: guestName,
          role: 'GUEST',
          isFamilyMember: true,
        },
      })
    } else if (!user.isFamilyMember) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isFamilyMember: true },
      })
    }

    // Create booking — family bookings are auto-confirmed with $0 amounts
    await prisma.booking.create({
      data: {
        guestId: user.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestName,
        guestEmail,
        guestPhone: guestPhone ?? null,
        numberOfGuests,
        basePrice: 0,
        addonsTotal: 0,
        depositAmount: 0,
        totalAmount: 0,
        status: 'CONFIRMED',
        notes: 'Family booking — no payment required',
      },
    })

    invalidateBookings()
    invalidateCalendar()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Family booking error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
