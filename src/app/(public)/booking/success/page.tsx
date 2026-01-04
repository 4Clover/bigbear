import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import { Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams

  if (!session_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Session</h1>
        <p className="text-gray-600 mb-8">No booking session found. Please try booking again.</p>
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
        <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
        <p className="text-gray-600 mb-8">
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
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-4">Booking Confirmed!</h1>
        <p className="text-gray-600">
          Thank you for your reservation. A confirmation email has been sent to{' '}
          {metadata.guestEmail}.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-8">
        <h2 className="text-xl font-semibold mb-6">Reservation Details</h2>
        <dl className="space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <dt className="text-gray-600">Guest Name</dt>
            <dd className="font-medium">{metadata.guestName}</dd>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <dt className="text-gray-600">Check-in</dt>
            <dd className="font-medium">{metadata.checkIn}</dd>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <dt className="text-gray-600">Check-out</dt>
            <dd className="font-medium">{metadata.checkOut}</dd>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <dt className="text-gray-600">Total Paid</dt>
            <dd className="font-medium text-emerald-600">
              ${((session.amount_total ?? 0) / 100).toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-2">What&apos;s Next?</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Check your email for a confirmation with all booking details</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>We&apos;ll send check-in instructions 2 days before your arrival</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
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
