
import { revalidatePath, revalidateTag } from 'next/cache'

// ---------------------------------------------------------------------------
// Cache tag namespace
// ---------------------------------------------------------------------------

/**
 * Centralized cache tag generators. Convention: `domain` or `domain:id`.
 * Used with `cacheTag()` in data-fetching and `revalidateTag()` in mutations.
 */
export const CacheTags = {
  gallery: () => 'gallery' as const,
  bookings: () => 'bookings' as const,
  maintenance: () => 'maintenance' as const,
  finance: () => 'finance' as const,
  calendar: () => 'calendar' as const,
  notifications: () => 'notifications' as const,
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

/** Invalidate maintenance caches (owner + worker views) */
export const invalidateMaintenance = () => {
  revalidateTag(CacheTags.maintenance(), { expire: 0 })
  revalidatePath('/owner/maintenance')
  revalidatePath('/worker/jobs')
  revalidatePath('/worker/schedule')
  revalidatePath('/worker/quotes')
}

/** Invalidate finance caches */
export const invalidateFinance = () => {
  revalidateTag(CacheTags.finance(), { expire: 0 })
  revalidatePath('/owner/finance')
}

/** Invalidate calendar caches */
export const invalidateCalendar = () => {
  revalidateTag(CacheTags.calendar(), { expire: 0 })
  revalidatePath('/owner/calendar')
}

/** Invalidate notification caches */
export const invalidateNotifications = () => {
  revalidateTag(CacheTags.notifications(), { expire: 0 })
  revalidatePath('/owner/settings')
}
