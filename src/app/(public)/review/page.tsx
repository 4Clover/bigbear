import { AlertTriangle, Star } from 'lucide-react'
import { verifyReviewToken } from '@/lib/review-token'
import { prisma } from '@/lib/prisma'
import { ReviewForm } from './ReviewForm'

interface ReviewPageProps {
  searchParams: Promise<{ token?: string }>
}

const StatusCard = ({ title, description }: { title: string; description: string }) => (
  <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
    <div className="rounded-2xl border border-border bg-card/95 p-8 shadow-lg">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wood-100 text-wood-700 dark:bg-wood-900/60 dark:text-wood-300">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  </div>
)

export const metadata = {
  title: 'Leave a Review - Grizzly Getaway',
  description: 'Share your experience at Grizzly Getaway.',
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <StatusCard
        title="Invalid review link"
        description="This review link is missing a token. Please use the link from your email."
      />
    )
  }

  let payload
  try {
    payload = await verifyReviewToken(token)
  } catch {
    return (
      <StatusCard
        title="This review link has expired"
        description="Review links are valid for 14 days. Contact us if you'd still like to leave a review."
      />
    )
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: { bookingId: payload.bookingId },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-wood-50/40 shadow-xl dark:to-wood-950/30">
        <div className="border-b border-border/70 px-6 py-5 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700 dark:border-forest-800 dark:bg-forest-950/40 dark:text-forest-300">
            <Star className="h-3.5 w-3.5" />
            Guest Review
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">
            {existingReview ? 'Update your review' : 'How was your stay?'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hi {payload.guestName}! Share your experience and optionally upload photos from your
            stay.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <ReviewForm
            token={token}
            existingReview={
              existingReview
                ? {
                    rating: existingReview.rating,
                    body: existingReview.body,
                    photoUrls: existingReview.photoUrls,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  )
}
