import { prisma } from '@/lib/prisma'
import { ReviewList } from './ReviewList'

export const metadata = {
  title: 'Reviews - Owner Dashboard',
}

export default async function OwnerReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      booking: {
        select: {
          checkIn: true,
          checkOut: true,
          guestEmail: true,
        },
      },
    },
    take: 100,
  })

  const serializedReviews = reviews.map((r) => ({
    id: r.id,
    guestName: r.guestName,
    guestEmail: r.booking.guestEmail,
    rating: r.rating,
    body: r.body,
    photoUrls: r.photoUrls,
    isPublished: r.isPublished,
    createdAt: r.createdAt.toISOString(),
    checkIn: r.booking.checkIn.toISOString(),
    checkOut: r.booking.checkOut.toISOString(),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''} &middot;{' '}
          {reviews.filter((r) => r.isPublished).length} published
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">No reviews yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Send review invites from the Bookings page to start collecting guest feedback.
          </p>
        </div>
      ) : (
        <ReviewList reviews={serializedReviews} />
      )}
    </div>
  )
}
