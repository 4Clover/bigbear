import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { getPublicGalleryImages } from '@/actions/gallery'
import PhotoCarousel from '@/components/gallery/PhotoCarousel'
import { GALLERY_CATEGORIES } from '@/lib/gallery-token'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gallery',
  description: 'Browse photos of our beautiful mountain retreat at Grizzly Getaway.',
}

export default async function GalleryPage() {
  const { guestPhotos, propertyPhotos } = await getPublicGalleryImages()

  const categorizedPhotos = GALLERY_CATEGORIES.map((cat) => ({
    category: cat,
    photos: propertyPhotos.filter((p) => p.category === cat),
  })).filter((group) => group.photos.length > 0)

  const hasAnyPhotos = guestPhotos.length > 0 || propertyPhotos.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Photo Gallery</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Take a virtual tour of our cozy mountain retreat. From stunning views to comfortable
          interiors, see what awaits you at Grizzly Getaway.
        </p>
      </div>

      {!hasAnyPhotos ? (
        <div className="text-center py-16 bg-muted rounded-xl">
          <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
          <p className="text-muted-foreground">
            Check back soon for photos of our beautiful cabin.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {guestPhotos.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground">Memories from Our Guests</h2>
              <PhotoCarousel
                images={guestPhotos.map((photo) => ({
                  url: photo.url,
                  caption: photo.caption,
                  guestName: undefined,
                }))}
              />
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold mb-6 text-foreground">Our Cabin</h2>

            {categorizedPhotos.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/40 p-8 text-center">
                <p className="text-muted-foreground">No property photos yet. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {categorizedPhotos.map(({ category, photos }) => (
                  <div key={category}>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">{category}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {photos.map((image) => (
                        <div
                          key={image.id}
                          className={`group relative aspect-square rounded-lg overflow-hidden border shadow-md transition-shadow hover:shadow-lg ${
                            image.isFeatured
                              ? 'ring-2 ring-forest-500 border-forest-300'
                              : 'border-border'
                          }`}
                        >
                          <Image
                            src={image.url}
                            alt={image.alt ?? `${category} photo`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />

                          {image.isFeatured && (
                            <span className="absolute left-3 top-3 rounded-full bg-forest-600 px-3 py-1 text-xs font-semibold text-white shadow">
                              Featured
                            </span>
                          )}

                          {image.caption && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                              <p className="text-sm text-white">{image.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {guestPhotos.length === 0 && propertyPhotos.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Guest photos are not available yet. Check back after upcoming stays.
            </div>
          )}

          {guestPhotos.length > 0 && propertyPhotos.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Property photos are being curated and will appear here soon.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
