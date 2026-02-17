import { AlertTriangle, Camera, CheckCircle2 } from 'lucide-react'
import type { Prisma } from '@prisma/client'

import GuestUploadForm from '@/components/gallery/GuestUploadForm'
import { verifyGalleryUploadToken } from '@/lib/gallery-token'
import { prisma } from '@/lib/prisma'

const MAX_UPLOADS = 3

type GalleryUploadPageProps = {
  searchParams: Promise<{ token?: string }>
}

type StatusCardProps = {
  icon: 'warning' | 'complete'
  title: string
  description: string
}

const StatusCard = ({ icon, title, description }: StatusCardProps) => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card/95 p-8 shadow-lg">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wood-100 text-wood-700 dark:bg-wood-900/60 dark:text-wood-300">
          {icon === 'warning' ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <CheckCircle2 className="h-6 w-6" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Guest Photo Upload',
  description: 'Share your favorite mountain memories from your stay.',
}

export default async function GalleryUploadPage({ searchParams }: GalleryUploadPageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <StatusCard
        icon="warning"
        title="Invalid upload link"
        description="This cabin memory link is missing a token. Please use the upload link from your checkout email."
      />
    )
  }

  try {
    const payload = await verifyGalleryUploadToken(token)

    const existingImages = await prisma.galleryImage.count({
      where: { bookingId: payload.bookingId } as unknown as Prisma.GalleryImageWhereInput,
    })

    if (existingImages >= MAX_UPLOADS) {
      return (
        <StatusCard
          icon="complete"
          title="You've already uploaded the maximum 3 photos"
          description="Thank you for sharing your mountain moments. Your photos are in our review queue and will appear in the gallery soon."
        />
      )
    }

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-wood-50/40 shadow-xl dark:to-wood-950/30">
          <div className="border-b border-border/70 px-6 py-5 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700 dark:border-forest-800 dark:bg-forest-950/40 dark:text-forest-300">
              <Camera className="h-3.5 w-3.5" />
              Guest Gallery Upload
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">Share your cabin highlights</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add up to {MAX_UPLOADS} favorite moments from your stay.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <GuestUploadForm
              token={token}
              guestName={payload.guestName}
              remainingUploads={MAX_UPLOADS - existingImages}
            />
          </div>
        </div>
      </div>
    )
  } catch (_error) {
    return (
      <StatusCard
        icon="warning"
        title="This upload link has expired"
        description="No worries, cabin memories keep. Reach out and we can send you a fresh upload link."
      />
    )
  }
}
