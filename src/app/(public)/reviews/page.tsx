import { Star } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PublicReviewList, type PublicReview } from './PublicReviewList'

// ISR — mutations bust this path immediately via invalidateReviews()
export const revalidate = 3600

export const metadata = {
  title: 'Guest Reviews - Grizzly Getaway',
  description: 'Read what guests say about their stay at Grizzly Getaway.',
}

export default async function PublicReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
  })

  const reviewDtos: PublicReview[] = reviews.map((review) => ({
    id: review.id,
    guestName: review.guestName,
    rating: review.rating,
    body: review.body,
    photoUrls: review.photoUrls,
    createdAt: review.createdAt.toISOString(),
  }))

  const count = reviewDtos.length
  const average = count > 0 ? reviewDtos.reduce((sum, review) => sum + review.rating, 0) / count : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Guest Reviews</h1>
        {count > 0 ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-forest-200 bg-forest-50 px-5 py-2.5 dark:border-forest-800 dark:bg-forest-950/40">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="text-lg font-semibold text-foreground">{average.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              from {count} review{count > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <p className="mx-auto max-w-2xl text-muted-foreground">
            No reviews yet — be our next guest and the first to share your stay!
          </p>
        )}
      </div>

      {count > 0 && <PublicReviewList reviews={reviewDtos} />}
    </div>
  )
}
