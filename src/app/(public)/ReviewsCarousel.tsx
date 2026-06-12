'use client'

import { useCallback } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import type { PublicReview } from './reviews/PublicReviewList'

interface ReviewsCarouselProps {
  reviews: PublicReview[]
}

export const ReviewsCarousel = ({ reviews }: ReviewsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: reviews.length > 3, align: 'start' })

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="min-w-0 flex-[0_0_100%] rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
            >
              <div className="flex gap-0.5" aria-label={`${String(review.rating)} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-none text-stone-300 dark:text-stone-600'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 line-clamp-5 leading-7 text-foreground">{review.body}</p>
              <p className="mt-4 text-sm font-medium text-foreground">{review.guestName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
            </article>
          ))}
        </div>
      </div>

      {reviews.length > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={scrollPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Next reviews"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
