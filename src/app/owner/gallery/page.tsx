import { getGalleryImages } from '@/actions/gallery'
import { GalleryManager } from '@/components/gallery/GalleryManager'
import type { GalleryImageWithUploader } from '@/components/gallery/GalleryManager'
import OwnerUploadSection from '@/components/gallery/OwnerUploadSection'
import { GALLERY_CATEGORIES } from '@/lib/gallery-token'
import type { GalleryCategory } from '@/lib/gallery-token'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gallery Management',
}

export default async function OwnerGalleryPage() {
  const images = await getGalleryImages()

  const isGalleryCategory = (value: string | null): value is GalleryCategory => {
    return value !== null && GALLERY_CATEGORIES.some((category) => category === value)
  }

  const normalizedImages: GalleryImageWithUploader[] = images.map((image) => {
    const uploadedBy: 'OWNER' | 'GUEST' =
      'uploadedBy' in image && image.uploadedBy === 'GUEST' ? 'GUEST' : 'OWNER'

    return {
      ...image,
      uploadedBy,
      bookingId:
        'bookingId' in image && typeof image.bookingId === 'string' ? image.bookingId : null,
      category: isGalleryCategory(image.category) ? image.category : GALLERY_CATEGORIES[0],
    }
  })

  const stats = {
    total: normalizedImages.length,
    published: normalizedImages.filter((image) => image.isPublished).length,
    guestPending: normalizedImages.filter(
      (image) => image.uploadedBy === 'GUEST' && !image.isPublished
    ).length,
    guestApproved: normalizedImages.filter(
      (image) => image.uploadedBy === 'GUEST' && image.isPublished
    ).length,
  }

  return (
    <div className="space-y-8">
      {stats.guestPending > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Pending Guest Photos
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {stats.guestPending} guest photo{stats.guestPending === 1 ? '' : 's'} waiting for
            approval.
          </p>
        </section>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Gallery Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload new photos, review guest submissions, and keep the public gallery fresh.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Published
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.published}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Guest Pending
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.guestPending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Guest Approved
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.guestApproved}</p>
        </div>
      </section>

      <OwnerUploadSection />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Manage All Images</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sort, edit, publish, or remove photos from the gallery.
          </p>
        </div>
        <GalleryManager images={normalizedImages} />
      </section>
    </div>
  )
}
