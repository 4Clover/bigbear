import { Ban, Calendar, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui'
import { bookingStatusVariant, bookingStatusLabel } from '@/lib/ui/status'

const getStats = async () => {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const yearStart = startOfYear(now)

  const [upcomingBookings, pendingCount, monthlyRevenue, yearlyRevenue, recentBookings] =
    await Promise.all([
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
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block hover:ring-2 hover:ring-forest-500 rounded-xl transition-shadow"
      >
        {content}
      </Link>
    )
  }

  return content
}

const DashboardPage = async () => {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your property.</p>
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
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Bookings</h2>
            <Link
              href="/owner/bookings"
              className="text-sm text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 font-medium"
            >
              View all
            </Link>
          </div>
          {stats.upcomingBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{booking.guestName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(booking.checkIn, 'MMM d')} - {format(booking.checkOut, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    ${Number(booking.totalAmount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          </div>
          {stats.recentBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{booking.guestName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(booking.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant={bookingStatusVariant[booking.status]}>
                    {bookingStatusLabel[booking.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/owner/calendar"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            View Calendar
          </Link>
          <Link
            href="/owner/calendar?action=block"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <Ban className="w-4 h-4" />
            Block Dates
          </Link>
          <Link
            href="/owner/bookings?status=PENDING"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Review Pending
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
