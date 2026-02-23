'use client'

import { useState, useTransition } from 'react'

import { createGalleryImage } from '@/actions/gallery'
import GalleryUploader from '@/components/gallery/GalleryUploader'
import { Button } from '@/components/ui/Button'
import { GALLERY_CATEGORIES } from '@/lib/gallery-token'
import type { GalleryCategory } from '@/lib/gallery-token'

const OwnerUploadSection = () => {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<GalleryCategory>(GALLERY_CATEGORIES[0])
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setUploadedUrl(null)
    setCategory(GALLERY_CATEGORIES[0])
    setAlt('')
    setCaption('')
    setIsFeatured(false)
  }

  const handleSubmit = () => {
    if (!uploadedUrl) {
      setError('Upload an image first')
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await createGalleryImage({
        url: uploadedUrl,
        alt: alt || undefined,
        caption: caption || undefined,
        category,
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to create gallery image')
        return
      }

      setSuccess('Image added to gallery')
      resetForm()
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card/95 shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-xl font-semibold text-foreground">Upload New Property Photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an image first, then add metadata before publishing.
        </p>
      </div>

      <div className="space-y-5 px-6 py-6">
        <GalleryUploader
          disabled={isPending}
          onUpload={(url) => {
            setUploadedUrl(url)
            setError(null)
            setSuccess(null)
          }}
        />

        {uploadedUrl && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Uploaded URL ready for metadata
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="owner-gallery-category" className="mb-1 block text-sm font-medium">
                  Category
                </label>
                <select
                  id="owner-gallery-category"
                  value={category}
                  disabled={isPending}
                  onChange={(event) => {
                    setCategory(event.target.value as GalleryCategory)
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  {GALLERY_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="owner-gallery-alt" className="mb-1 block text-sm font-medium">
                  Alt text
                </label>
                <input
                  id="owner-gallery-alt"
                  type="text"
                  value={alt}
                  disabled={isPending}
                  onChange={(event) => {
                    setAlt(event.target.value)
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  placeholder="Describe the image for accessibility"
                />
              </div>
            </div>

            <div>
              <label htmlFor="owner-gallery-caption" className="mb-1 block text-sm font-medium">
                Caption
              </label>
              <textarea
                id="owner-gallery-caption"
                rows={3}
                value={caption}
                disabled={isPending}
                onChange={(event) => {
                  setCaption(event.target.value)
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                placeholder="Optional short caption"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isFeatured}
                disabled={isPending}
                onChange={(event) => {
                  setIsFeatured(event.target.checked)
                }}
                className="h-4 w-4 rounded border-border"
              />
              Mark as featured
            </label>

            <div className="pt-1">
              <Button
                type="button"
                isLoading={isPending}
                onClick={() => {
                  handleSubmit()
                }}
              >
                Save to Gallery
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300">
            {success}
          </p>
        )}
      </div>
    </section>
  )
}

export default OwnerUploadSection
