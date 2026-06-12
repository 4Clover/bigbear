'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

interface PhotoCarouselImage {
  url: string
  caption?: string | null
  guestName?: string | null
}

interface PhotoCarouselProps {
  images: PhotoCarouselImage[]
}

interface AutoplayControls {
  stop: () => void
  play: () => void
}

const PhotoCarousel = ({ images }: PhotoCarouselProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ])

  const getAutoplay = useCallback(() => {
    return (emblaApi?.plugins() as { autoplay?: AutoplayControls } | undefined)?.autoplay
  }, [emblaApi])

  const handleUserInteraction = useCallback(() => {
    getAutoplay()?.stop()
  }, [getAutoplay])

  const scrollPrev = useCallback(() => {
    handleUserInteraction()
    emblaApi?.scrollPrev()
  }, [emblaApi, handleUserInteraction])

  const scrollNext = useCallback(() => {
    handleUserInteraction()
    emblaApi?.scrollNext()
  }, [emblaApi, handleUserInteraction])

  const scrollTo = useCallback(
    (index: number) => {
      handleUserInteraction()
      emblaApi?.scrollTo(index)
    },
    [emblaApi, handleUserInteraction]
  )

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    const updateIndex = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on('select', updateIndex)
    emblaApi.on('reInit', updateIndex)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- embla's documented init pattern: snap list only exists once the API instance is ready
    setScrollSnaps(emblaApi.scrollSnapList())
    updateIndex()

    return () => {
      emblaApi.off('select', updateIndex)
      emblaApi.off('reInit', updateIndex)
    }
  }, [emblaApi])

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        Guest photos coming soon
      </div>
    )
  }

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Guest photo carousel"
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-black"
      onMouseEnter={() => {
        getAutoplay()?.stop()
      }}
      onMouseLeave={() => {
        getAutoplay()?.play()
      }}
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {images.map((image, index) => (
            <div key={`${image.url}-${index}`} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-video">
                <Image
                  src={image.url}
                  alt={image.caption ?? `Guest photo ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>

              {(image.caption ?? image.guestName) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 sm:p-5">
                  {image.caption && (
                    <p className="text-sm font-medium text-white sm:text-base">{image.caption}</p>
                  )}
                  {image.guestName && (
                    <p className="mt-1 text-xs text-white/85 sm:text-sm">
                      Photo by {image.guestName}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {scrollSnaps.map((_, index) => {
          const isActive = index === selectedIndex

          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                scrollTo(index)
              }}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                isActive ? 'w-6 bg-black/85' : 'w-2.5 bg-black/45 hover:bg-black/60'
              }`}
            />
          )
        })}
      </div>
    </section>
  )
}

export default PhotoCarousel
