import { revalidatePath, revalidateTag } from 'next/cache'

// ---------------------------------------------------------------------------
// Cache tag namespace
// ---------------------------------------------------------------------------

/**
 * Centralized cache tag generators. Convention: `domain` or `domain:id`.
 * Used with `cacheTag()` in data-fetching and `revalidateTag()` in mutations.
 */
const CacheTags = {
  gallery: () => 'gallery' as const,
  bookings: () => 'bookings' as const,
  maintenance: () => 'maintenance' as const,
  finance: () => 'finance' as const,
  calendar: () => 'calendar' as const,
  notifications: () => 'notifications' as const,
  reviews: () => 'reviews' as const,
  family: () => 'family' as const,
} as const

// ---------------------------------------------------------------------------
// Domain invalidation helpers
// ---------------------------------------------------------------------------

/** Invalidate all gallery caches (owner + public gallery pages) */
export const invalidateGallery = () => {
  revalidateTag(CacheTags.gallery(), { expire: 0 })
  revalidatePath('/owner/gallery')
  revalidatePath('/gallery')
}

/** Invalidate booking caches (bookings list + dashboard) */
export const invalidateBookings = () => {
  revalidateTag(CacheTags.bookings(), { expire: 0 })
  revalidatePath('/owner/bookings')
  revalidatePath('/owner/dashboard')
}

/** Invalidate calendar caches */
export const invalidateCalendar = () => {
  revalidateTag(CacheTags.calendar(), { expire: 0 })
  revalidatePath('/owner/calendar')
}

/** Invalidate review caches (owner reviews page) */
export const invalidateReviews = () => {
  revalidateTag(CacheTags.reviews(), { expire: 0 })
  revalidatePath('/owner/reviews')
}

/** Invalidate family caches (owner family settings) */
export const invalidateFamily = () => {
  revalidateTag(CacheTags.family(), { expire: 0 })
  revalidatePath('/owner/settings/family')
}

/** Invalidate notification preference caches */
export const invalidateNotifications = () => {
  revalidateTag(CacheTags.notifications(), { expire: 0 })
  revalidatePath('/owner/settings')
}
