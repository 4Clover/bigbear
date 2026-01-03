import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatICalDate } from '@/lib/utils/calendar'

export const dynamic = 'force-dynamic'

const formatICalTimestamp = (date: Date): string => {
  const isoString = date.toISOString().replace(/[-:]/g, '')
  return (isoString.split('.')[0] ?? '') + 'Z'
}

export const GET = async (): Promise<NextResponse> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        checkOut: { gte: new Date() },
      },
    })

    const blockedDates = await prisma.blockedDate.findMany({
      where: { endDate: { gte: new Date() } },
    })

    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cabin Rental//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Cabin Availability
`

    const dtstamp = formatICalTimestamp(new Date())

    for (const booking of bookings) {
      const uid = `booking-${booking.id}@cabin`
      const dtstart = formatICalDate(booking.checkIn)
      const dtend = formatICalDate(booking.checkOut)

      ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dtstart}
DTEND;VALUE=DATE:${dtend}
SUMMARY:Booked
STATUS:CONFIRMED
END:VEVENT
`
    }

    for (const blocked of blockedDates) {
      const uid = `blocked-${blocked.id}@cabin`
      const dtstart = formatICalDate(blocked.startDate)
      const dtend = formatICalDate(blocked.endDate)
      const summary = blocked.reason ? `Blocked - ${blocked.reason}` : 'Blocked'

      ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dtstart}
DTEND;VALUE=DATE:${dtend}
SUMMARY:${summary}
STATUS:CONFIRMED
END:VEVENT
`
    }

    ical += 'END:VCALENDAR'

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cabin-calendar.ics"',
      },
    })
  } catch (error) {
    console.error('Error generating iCal:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    )
  }
}
