'use client'

import { useMemo, useState, useTransition } from 'react'

import { createGuestGalleryImage } from '@/actions/gallery'
import { Textarea } from '@/components/ui/Textarea'

import GalleryUploader from './GalleryUploader'

const MAX_UPLOADS = 3
const MAX_CAPTION_LENGTH = 200

interface GuestUploadFormProps {
  token: string
  guestName: string
  remainingUploads: number
}

const GuestUploadForm = ({ token, guestName, remainingUploads }: GuestUploadFormProps) => {
  const initialUploadedCount = MAX_UPLOADS - remainingUploads

  const [uploadedCount, setUploadedCount] = useState(initialUploadedCount)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sessionUploadedCount = uploadedCount - initialUploadedCount
  const remainingCount = useMemo(
    () => Math.max(0, remainingUploads - sessionUploadedCount),
    [remainingUploads, sessionUploadedCount]
  )
  const reachedLimit = remainingCount <= 0

  const handleUpload = (url: string) => {
    if (reachedLimit || isPending) {
      return
    }

    startTransition(() => {
      void (async () => {
        setError(null)
        setSuccessMessage(null)

        const result = await createGuestGalleryImage({
          token,
          url,
          caption: caption.trim() || undefined,
        })

        if (!result.success) {
          setError(result.error ?? 'We could not save this photo. Please try again.')
          return
        }

        setUploadedCount((count) => count + 1)
        setCaption('')

        const nextRemainingCount = Math.max(0, remainingCount - 1)

        if (nextRemainingCount === 0) {
          setSuccessMessage(
            'Thanks for sharing! Your photos will appear in our gallery after review.'
          )
          return
        }

        setSuccessMessage('Photo received. Keep sharing your favorite cabin moments.')
      })().catch(() => {
        setError('Upload saved to storage, but we could not finish processing. Please retry.')
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Hi {guestName}! Share your favorite photos from your stay
        </h2>
        <p className="text-sm text-muted-foreground">{remainingCount} photos remaining</p>
      </div>

      <Textarea
        value={caption}
        onChange={(event) => {
          setCaption(event.target.value)
        }}
        maxLength={MAX_CAPTION_LENGTH}
        label="Caption (optional)"
        placeholder="Tell us where this was taken or what made this moment special."
        className="min-h-[120px]"
        disabled={reachedLimit || isPending}
      />
      <p className="-mt-4 text-xs text-muted-foreground">
        {caption.length}/{MAX_CAPTION_LENGTH}
      </p>

      <GalleryUploader
        onUpload={(url) => {
          handleUpload(url)
        }}
        clientPayload={token}
        disabled={reachedLimit || isPending}
      />

      {isPending && (
        <p className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-700 dark:border-forest-900 dark:bg-forest-950/40 dark:text-forest-300">
          Saving your photo details...
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-700 dark:border-forest-900 dark:bg-forest-950/40 dark:text-forest-300">
          {successMessage}
        </p>
      )}

      {reachedLimit && !successMessage && (
        <p className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-700 dark:border-forest-900 dark:bg-forest-950/40 dark:text-forest-300">
          Thanks for sharing! Your photos will appear in our gallery after review.
        </p>
      )}
    </div>
  )
}

export default GuestUploadForm
