'use client'

import { useState, useRef } from 'react'
import { Star, Upload, X, CheckCircle2, Loader2 } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { Button } from '@/components/ui/Button'
import { submitReview } from '@/actions/reviews'

interface ReviewFormProps {
  token: string
  existingReview: {
    rating: number
    body: string
    photoUrls: string[]
  } | null
}

export const ReviewForm = ({ token, existingReview }: ReviewFormProps) => {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [photoUrls, setPhotoUrls] = useState<string[]>(existingReview?.photoUrls ?? [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remaining = 3 - photoUrls.length
    const toUpload = Array.from(files).slice(0, remaining)

    setIsUploading(true)
    setError('')

    try {
      for (const file of toUpload) {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/review',
          clientPayload: token,
        })
        setPhotoUrls((prev) => [...prev, blob.url])
      }
    } catch {
      setError('Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    if (!body.trim()) {
      setError('Please write a review')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const result = await submitReview({ token, rating, body, photoUrls })
      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Failed to submit review')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-forest-600 dark:bg-forest-900/40 dark:text-forest-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Thank you for your review!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your feedback helps future guests and means a lot to us. Your review will appear once
          approved by the host.
        </p>
      </div>
    )
  }

  const displayRating = hoveredRating || rating

  return (
    <div className="space-y-6">
      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star)
              }}
              onMouseEnter={() => {
                setHoveredRating(star)
              }}
              onMouseLeave={() => {
                setHoveredRating(0)
              }}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-stone-300 dark:text-stone-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Review Body */}
      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-foreground mb-2">
          Your Review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
          }}
          placeholder="Tell us about your stay — what did you love? Any tips for future guests?"
          rows={5}
          maxLength={5000}
          className="w-full px-4 py-3 border border-border rounded-xl text-foreground bg-background placeholder:text-muted-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground text-right">{body.length}/5000</p>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Photos (optional, up to 3)
        </label>

        {photoUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            {photoUrls.map((url) => (
              <div key={url} className="relative group rounded-lg overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Review photo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    removePhoto(url)
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photoUrls.length < 3 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              {isUploading ? 'Uploading...' : 'Add Photos'}
            </Button>
            <span className="text-xs text-muted-foreground">{3 - photoUrls.length} remaining</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                void handlePhotoUpload(e)
              }}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        onClick={() => {
          void handleSubmit()
        }}
        isLoading={isSubmitting}
        disabled={rating === 0 || !body.trim()}
        className="w-full"
        size="lg"
      >
        {existingReview ? 'Update Review' : 'Submit Review'}
      </Button>
    </div>
  )
}
