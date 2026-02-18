import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addDays, eachDayOfInterval, startOfDay, subDays } from 'date-fns'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  // Check rate limit
  const clientId = getClientIdentifier(request)
  const rateLimitResult = await checkRateLimit(`availability:${clientId}`, RATE_LIMITS.availability)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMITS.availability.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    )
  }

  try {
    const today = startOfDay(new Date())
    const futureDate = addDays(today, 365) // Look ahead 1 year

    // Get all confirmed bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PENDING'] },
        checkOut: { gte: today },
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
    })

    // Get all blocked dates
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        endDate: { gte: today },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    })

    // Collect all blocked dates
    const allBlockedDates: Date[] = []

    // Add booking dates (exclude checkout day — guests depart, next guest can check in)
    for (const booking of bookings) {
      const days = eachDayOfInterval({
        start: new Date(booking.checkIn),
        end: subDays(new Date(booking.checkOut), 1),
      })
      allBlockedDates.push(...days)
    }

    // Add manually blocked dates
    for (const blocked of blockedDates) {
      const days = eachDayOfInterval({
        start: new Date(blocked.startDate),
        end: new Date(blocked.endDate),
      })
      allBlockedDates.push(...days)
    }

    // Remove duplicates and filter to within our range
    const uniqueDates = [...new Set(allBlockedDates.map((d) => d.toISOString()))].filter(
      (dateStr) => {
        const date = new Date(dateStr)
        return date >= today && date <= futureDate
      }
    )

    return NextResponse.json(uniqueDates)
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json([], { status: 500 })
  }
}
