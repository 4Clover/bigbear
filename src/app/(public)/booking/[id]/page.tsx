import { AlertTriangle, CalendarCheck, CalendarX, Clock } from 'lucide-react'
import Link from 'next/link'
import { verifyPaymentClaimToken } from '@/lib/payment-claim-token'
import { prisma } from '@/lib/prisma'
import { PAYMENT_METHOD_INFO } from '@/lib/payment-methods'
import { formatCurrency, formatDate } from '@/lib/format'
import { ClaimPanel } from './ClaimPanel'

interface ClaimPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

const StatusCard = ({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) => (
  <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
    <div className="rounded-2xl border border-border bg-card/95 p-8 shadow-lg">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wood-100 text-wood-700 dark:bg-wood-900/60 dark:text-wood-300">
        {icon}
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      {children}
    </div>
  </div>
)

const InvalidLinkCard = () => (
  <StatusCard
    icon={<AlertTriangle className="h-6 w-6" />}
    title="Invalid booking link"
    description="This link is invalid or has expired. Please use the link from your confirmation email, or contact us if you need a new one."
  />
)

export const metadata = {
  title: 'Your Booking - Grizzly Getaway',
  description: 'Review your booking hold and payment instructions.',
}

export default async function BookingClaimPage({ params, searchParams }: ClaimPageProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    return <InvalidLinkCard />
  }

  let payload
  try {
    payload = await verifyPaymentClaimToken(token)
  } catch {
    return <InvalidLinkCard />
  }

  if (payload.bookingId !== id) {
    return <InvalidLinkCard />
  }

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (booking?.guestEmail !== payload.guestEmail) {
    return <InvalidLinkCard />
  }

  if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
    return (
      <StatusCard
        icon={<CalendarCheck className="h-6 w-6" />}
        title="Your booking is confirmed"
        description={`We've verified your payment — see you at the cabin ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}. A confirmation email has all the details.`}
      />
    )
  }

  if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
    return (
      <StatusCard
        icon={<CalendarX className="h-6 w-6" />}
        title="This booking was cancelled"
        description="The hold on these dates is no longer active. If you still want to stay with us, you're welcome to book again."
      >
        <Link
          href="/book"
          className="mt-5 inline-flex items-center rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-700"
        >
          Book new dates
        </Link>
      </StatusCard>
    )
  }

  // PENDING — split on hold expiry
  const holdExpiresAt = booking.holdExpiresAt

  if (!holdExpiresAt || holdExpiresAt <= new Date()) {
    return (
      <StatusCard
        icon={<Clock className="h-6 w-6" />}
        title="This hold has expired"
        description="We couldn't verify your payment within the 24-hour hold window, so the dates have opened back up. If your payment is already on its way, reply to your confirmation email and we'll sort it out."
      >
        <Link
          href="/book"
          className="mt-5 inline-flex items-center rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-700"
        >
          Book again
        </Link>
      </StatusCard>
    )
  }

  const method = PAYMENT_METHOD_INFO[booking.paymentMethod]

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-wood-50/40 shadow-xl dark:to-wood-950/30">
        <div className="border-b border-border/70 px-6 py-5 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700 dark:border-forest-800 dark:bg-forest-950/40 dark:text-forest-300">
            <Clock className="h-3.5 w-3.5" />
            Dates Held
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Your dates are held</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hi {booking.guestName}! Send your payment to confirm the booking, then let us know
            below.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Check-in
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatDate(booking.checkIn)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Check-out
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatDate(booking.checkOut)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Amount due
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatCurrency(Number(booking.totalAmount))}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border border-forest-200 bg-forest-50/60 p-4 dark:border-forest-800 dark:bg-forest-950/30">
            <h2 className="text-sm font-semibold text-foreground">Payment instructions</h2>
            {booking.paymentMethod === 'CONTACT_OWNER' ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The owner has received your message and will get back to you about payment. Once
                you&apos;ve arranged and sent it, mark it below.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Send <strong>{formatCurrency(Number(booking.totalAmount))}</strong> via{' '}
                <strong>{method.name}</strong> to <strong>{method.handle}</strong>. Include your
                name and dates in the payment note.
              </p>
            )}
          </div>

          <ClaimPanel
            bookingId={booking.id}
            token={token}
            holdExpiresAt={holdExpiresAt.toISOString()}
            alreadyClaimed={booking.paymentClaimedAt !== null}
          />
        </div>
      </div>
    </div>
  )
}
