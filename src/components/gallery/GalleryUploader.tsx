'use client'

import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import Image from 'next/image'
import { upload } from '@vercel/blob/client'

interface GalleryUploaderProps {
  onUpload: (url: string) => void
  uploadUrl?: string
  clientPayload?: string
  disabled?: boolean
}

const GalleryUploader = ({
  onUpload,
  uploadUrl = '/api/upload/gallery',
  clientPayload,
  disabled = false,
}: GalleryUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (disabled || files.length === 0) {
        return
      }

      setIsUploading(true)
      setError(null)

      try {
        const newImages: string[] = []

        for (const file of Array.from(files)) {
          const blob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: uploadUrl,
            ...(clientPayload ? { clientPayload } : {}),
          })

          newImages.push(blob.url)
          onUpload(blob.url)
        }

        setUploadedImages((prev) => [...prev, ...newImages])
      } catch (uploadError) {
        console.error('Gallery upload failed:', uploadError)
        setError('Failed to upload image. Please try again.')
      } finally {
        setIsUploading(false)
      }
    },
    [clientPayload, disabled, onUpload, uploadUrl]
  )

  const handleDrag = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (disabled || isUploading) {
        return
      }

      if (event.type === 'dragenter' || event.type === 'dragover') {
        setDragActive(true)
        return
      }

      if (event.type === 'dragleave') {
        setDragActive(false)
      }
    },
    [disabled, isUploading]
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(false)

      if (disabled || isUploading) {
        return
      }

      if (event.dataTransfer.files.length > 0) {
        void handleFiles(event.dataTransfer.files)
      }
    },
    [disabled, handleFiles, isUploading]
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled || isUploading) {
        return
      }

      if (event.target.files && event.target.files.length > 0) {
        void handleFiles(event.target.files)
      }
    },
    [disabled, handleFiles, isUploading]
  )

  const isDisabled = disabled || isUploading

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!isDisabled) {
            inputRef.current?.click()
          }
        }}
        className={`
          relative rounded-lg border-dashed border-2 border-border p-6 text-center
          transition-colors
          ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${dragActive ? 'border-forest-500 bg-forest-50 dark:bg-forest-950' : 'bg-stone-50/40 dark:bg-stone-900/30'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={isDisabled}
          className="hidden"
        />

        <p className="text-sm text-muted-foreground">
          {isUploading ? (
            <span className="font-medium text-forest-600">Uploading images...</span>
          ) : (
            <>
              <span className="font-semibold text-wood-700 dark:text-wood-300">
                Click to upload
              </span>{' '}
              or drag and drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
          JPG, PNG, or WebP up to 10MB each
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Uploaded images</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uploadedImages.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={url}
                  alt={`Gallery upload preview ${index + 1}`}
                  width={200}
                  height={128}
                  className="h-32 w-full object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GalleryUploader
