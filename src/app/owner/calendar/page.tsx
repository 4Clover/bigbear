import { prisma } from '@/lib/prisma'
import CalendarPageClient from './CalendarPageClient'

const getCalendarData = async () => {
  const [bookings, blockedDates, calendarSyncs] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
      },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.blockedDate.findMany({
      orderBy: { startDate: 'asc' },
    }),
    prisma.calendarSync.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  return { bookings, blockedDates, calendarSyncs }
}

const CalendarPage = async () => {
  const { bookings, blockedDates, calendarSyncs } = await getCalendarData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500">View and manage bookings and blocked dates.</p>
      </div>

      <CalendarPageClient
        bookings={bookings}
        blockedDates={blockedDates}
        calendarSyncs={calendarSyncs}
      />
    </div>
  )
}

export default CalendarPage
