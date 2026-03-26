'use client'

import { useState, useTransition } from 'react'
import { Star, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toggleReviewPublished } from '@/actions/reviews'

interface ReviewItem {
  id: string
  guestName: string
  guestEmail: string
  rating: number
  body: string
  photoUrls: string[]
  isPublished: boolean
  createdAt: string
  checkIn: string
  checkOut: string
}

interface ReviewListProps {
  reviews: ReviewItem[]
}

export const ReviewList = ({ reviews: initialReviews }: ReviewListProps) => {
  const [reviews, setReviews] = useState(initialReviews)
  const [isPending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggle = (reviewId: string) => {
    setTogglingId(reviewId)
    startTransition(async () => {
      const result = await toggleReviewPublished({ reviewId })
      if (result.success) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, isPublished: !r.isPublished } : r))
        )
      }
      setTogglingId(null)
    })
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{review.guestName}</h3>
                  <Badge variant={review.isPublished ? 'success' : 'secondary'}>
                    {review.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {review.guestEmail} &middot; Stayed {formatDate(review.checkIn)} -{' '}
                  {formatDate(review.checkOut)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleToggle(review.id)
                }}
                disabled={isPending && togglingId === review.id}
              >
                {review.isPublished ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1.5" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1.5" />
                    Publish
                  </>
                )}
              </Button>
            </div>

            {/* Rating */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= review.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-none text-stone-300 dark:text-stone-600'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {formatDate(review.createdAt)}
              </span>
            </div>

            {/* Body */}
            <p className="text-foreground whitespace-pre-wrap">{review.body}</p>

            {/* Photos */}
            {review.photoUrls.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {review.photoUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-24 h-24 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Guest review photo"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
