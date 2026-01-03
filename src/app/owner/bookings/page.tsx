import { prisma } from '@/lib/prisma'
import BookingTable from '@/components/owner/BookingTable'
import BookingFilters from '@/components/owner/BookingFilters'
import type { BookingStatus } from '@prisma/client'

interface SearchParams {
  status?: string
  search?: string
  from?: string
  to?: string
}

const getBookings = async (searchParams: SearchParams) => {
  const { status, search, from, to } = searchParams

  const where: {
    status?: { in: BookingStatus[] }
    OR?: ({ guestName: { contains: string; mode: 'insensitive' } } | { guestEmail: { contains: string; mode: 'insensitive' } })[]
    checkIn?: { gte?: Date; lte?: Date }
  } = {}

  if (status) {
    const statuses = status.split(',') as BookingStatus[]
    where.status = { in: statuses }
  }

  if (search) {
    where.OR = [
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestEmail: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (from || to) {
    where.checkIn = {}
    if (from) where.checkIn.gte = new Date(from)
    if (to) where.checkIn.lte = new Date(to)
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { checkIn: 'desc' },
  })

  return bookings
}

const BookingsPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) => {
  const params = await searchParams
  const bookings = await getBookings(params)

  const statusCounts = await prisma.booking.groupBy({
    by: ['status'],
    _count: { status: true },
  })

  const counts = statusCounts.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = item._count.status
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500">Manage all your property bookings.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).map(
          (status) => (
            <div
              key={status}
              className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <span className="text-gray-500">{status}:</span>{' '}
              <span className="font-medium">{counts[status] ?? 0}</span>
            </div>
          )
        )}
      </div>

      <BookingFilters
        currentStatus={params.status}
        currentSearch={params.search}
        currentFrom={params.from}
        currentTo={params.to}
      />

      <BookingTable bookings={bookings} />
    </div>
  )
}

export default BookingsPage
