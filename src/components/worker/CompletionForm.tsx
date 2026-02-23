'use client'

import { useState } from 'react'
import { submitWorkCompletion } from '@/actions/maintenance'
import ProofPhotoUploader from './ProofPhotoUploader'

interface CompletionFormProps {
  jobId: string
  jobTitle: string
  onSuccess: () => void
  onCancel: () => void
}

const CompletionForm = ({ jobId, jobTitle, onSuccess, onCancel }: CompletionFormProps) => {
  const [photos, setPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const description = formData.get('description') as string
    const hoursWorkedStr = formData.get('hoursWorked') as string
    const hoursWorked = hoursWorkedStr ? parseFloat(hoursWorkedStr) : undefined
    const materialsUsed = formData.get('materialsUsed') as string
    const unexpectedIssues = formData.get('unexpectedIssues') as string
    const finalAmountStr = formData.get('finalAmount') as string
    const finalAmount = finalAmountStr ? parseFloat(finalAmountStr) : undefined

    try {
      await submitWorkCompletion({
        jobId,
        description: description || undefined,
        images: photos,
        hoursWorked,
        materialsUsed: materialsUsed || undefined,
        unexpectedIssues: unexpectedIssues || undefined,
        finalAmount,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit completion')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Complete Work for: {jobTitle}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Proof Photos *
          </label>
          <ProofPhotoUploader onUpload={setPhotos} existingPhotos={photos} />
          {photos.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Please upload at least one photo</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Work Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="Describe the work completed..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hoursWorked" className="block text-sm font-medium text-foreground mb-1">
              Hours Worked
            </label>
            <input
              type="number"
              id="hoursWorked"
              name="hoursWorked"
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="finalAmount" className="block text-sm font-medium text-foreground mb-1">
              Final Amount ($)
            </label>
            <input
              type="number"
              id="finalAmount"
              name="finalAmount"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="materialsUsed" className="block text-sm font-medium text-foreground mb-1">
            Materials Used
          </label>
          <textarea
            id="materialsUsed"
            name="materialsUsed"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="List any materials used..."
          />
        </div>

        <div>
          <label htmlFor="unexpectedIssues" className="block text-sm font-medium text-foreground mb-1">
            Unexpected Issues
          </label>
          <textarea
            id="unexpectedIssues"
            name="unexpectedIssues"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="Any issues encountered during work..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || photos.length === 0}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Completion'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default CompletionForm
