import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gallery',
  description: 'Browse photos of our beautiful mountain retreat at Grizzly Getaway.',
}

export default async function GalleryPage() {
  const images = await prisma.galleryImage.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
  })

  const categories = [...new Set(images.filter((img) => img.category).map((img) => img.category))]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Photo Gallery</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Take a virtual tour of our cozy mountain retreat. From stunning views to comfortable
          interiors, see what awaits you at Grizzly Getaway.
        </p>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-16 bg-muted rounded-xl">
          <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
          <p className="text-muted-foreground">
            Check back soon for photos of our beautiful cabin.
          </p>
        </div>
      ) : (
        <>
          {/* Featured images */}
          {images.some((img) => img.isFeatured) && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-foreground">Featured</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images
                  .filter((img) => img.isFeatured)
                  .slice(0, 2)
                  .map((image) => (
                    <div
                      key={image.id}
                      className="relative aspect-video rounded-xl overflow-hidden shadow-lg border border-border"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt ?? 'Cabin photo'}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <p className="text-white text-sm">{image.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All images by category */}
          {categories.length > 0 ? (
            categories.map((category) => (
              <div key={category} className="mb-12">
                <h2 className="text-2xl font-bold mb-6 capitalize text-foreground">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {images
                    .filter((img) => img.category === category)
                    .map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-border"
                      >
                        <Image
                          src={image.url}
                          alt={image.alt ?? 'Cabin photo'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-border"
                >
                  <Image
                    src={image.url}
                    alt={image.alt ?? 'Cabin photo'}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
