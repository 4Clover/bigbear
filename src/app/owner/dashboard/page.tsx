import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns'

const getStats = async () => {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const yearStart = startOfYear(now)

  const [
    upcomingBookings,
    pendingCount,
    monthlyRevenue,
    yearlyRevenue,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        checkIn: { gte: now },
      },
      orderBy: { checkIn: 'asc' },
      take: 5,
    }),
    prisma.booking.count({
      where: { status: 'PENDING' },
    }),
    prisma.booking.aggregate({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: yearStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { guest: { select: { name: true, email: true } } },
    }),
  ])

  return {
    upcomingBookings,
    pendingCount,
    monthlyRevenue: Number(monthlyRevenue._sum.totalAmount ?? 0),
    yearlyRevenue: Number(yearlyRevenue._sum.totalAmount ?? 0),
    recentBookings,
  }
}

const StatCard = ({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  href?: string
}) => {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:ring-2 hover:ring-emerald-500 rounded-xl transition-shadow">
        {content}
      </Link>
    )
  }

  return content
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
}

const DashboardPage = async () => {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here&apos;s an overview of your property.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Requests"
          value={stats.pendingCount}
          subtitle="Awaiting approval"
          href="/owner/bookings?status=PENDING"
        />
        <StatCard
          title="Upcoming Bookings"
          value={stats.upcomingBookings.length}
          subtitle="Confirmed reservations"
          href="/owner/bookings?status=CONFIRMED"
        />
        <StatCard
          title="This Month"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          subtitle={format(new Date(), 'MMMM yyyy')}
        />
        <StatCard
          title="Year to Date"
          value={`$${stats.yearlyRevenue.toLocaleString()}`}
          subtitle={`Since Jan ${format(new Date(), 'yyyy')}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
            <Link
              href="/owner/bookings"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all
            </Link>
          </div>
          {stats.upcomingBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-500">
                      {format(booking.checkIn, 'MMM d')} - {format(booking.checkOut, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    ${Number(booking.totalAmount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {stats.recentBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-500">
                      {format(booking.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[booking.status] ?? ''}`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/owner/calendar"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            View Calendar
          </Link>
          <Link
            href="/owner/calendar?action=block"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            Block Dates
          </Link>
          <Link
            href="/owner/bookings?status=PENDING"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Review Pending
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
