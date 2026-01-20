import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import { Button, Card, CardContent } from '@/components/ui'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Booking Confirmed',
  description: 'Your Big Bear Cabin reservation has been confirmed.',
}

interface PageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams

  if (!session_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Invalid Session</h1>
        <p className="text-muted-foreground mb-8">No booking session found. Please try booking again.</p>
        <Link href="/book">
          <Button>Book Now</Button>
        </Link>
      </div>
    )
  }

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Session Not Found</h1>
        <p className="text-muted-foreground mb-8">
          We couldn&apos;t find this booking session. Please contact us if you believe this is an
          error.
        </p>
        <Link href="/contact">
          <Button>Contact Us</Button>
        </Link>
      </div>
    )
  }

  const metadata = session.metadata ?? {}

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-forest-100 dark:bg-forest-900 text-forest-600 dark:text-forest-400 mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">Booking Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your reservation. A confirmation email has been sent to{' '}
          {metadata.guestEmail}.
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="py-8">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Reservation Details</h2>
          <dl className="space-y-4">
            <div className="flex justify-between py-3 border-b border-border">
              <dt className="text-muted-foreground">Guest Name</dt>
              <dd className="font-medium text-foreground">{metadata.guestName}</dd>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <dt className="text-muted-foreground">Check-in</dt>
              <dd className="font-medium text-foreground">{metadata.checkIn}</dd>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <dt className="text-muted-foreground">Check-out</dt>
              <dd className="font-medium text-foreground">{metadata.checkOut}</dd>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <dt className="text-muted-foreground">Total Paid</dt>
              <dd className="font-medium text-forest-600 dark:text-forest-400">
                ${((session.amount_total ?? 0) / 100).toFixed(2)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="bg-forest-50 dark:bg-forest-900/30 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-2 text-foreground">What&apos;s Next?</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-forest-600 dark:text-forest-400 flex-shrink-0 mt-0.5" />
            <span>Check your email for a confirmation with all booking details</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-forest-600 dark:text-forest-400 flex-shrink-0 mt-0.5" />
            <span>We&apos;ll send check-in instructions 2 days before your arrival</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-forest-600 dark:text-forest-400 flex-shrink-0 mt-0.5" />
            <span>Contact us anytime if you have questions about your stay</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <Link href="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    </div>
  )
}
