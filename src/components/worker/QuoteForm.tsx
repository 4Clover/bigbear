'use client'

import { useState } from 'react'
import { submitQuote } from '@/actions/maintenance'

interface QuoteFormProps {
  jobId: string
  jobTitle: string
  onSuccess: () => void
  onCancel: () => void
}

const QuoteForm = ({ jobId, jobTitle, onSuccess, onCancel }: QuoteFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const amount = parseFloat(formData.get('amount') as string)
    const description = formData.get('description') as string
    const estimatedDaysStr = formData.get('estimatedDays') as string
    const estimatedDays = estimatedDaysStr ? parseInt(estimatedDaysStr, 10) : undefined

    try {
      await submitQuote({
        jobId,
        amount,
        description: description || undefined,
        estimatedDays,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quote')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Submit Quote for: {jobTitle}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
            Quote Amount ($) *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="estimatedDays" className="block text-sm font-medium text-foreground mb-1">
            Estimated Days to Complete
          </label>
          <input
            type="number"
            id="estimatedDays"
            name="estimatedDays"
            min="1"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="1"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Description / Notes
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder="Describe what the quote includes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quote'}
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

export default QuoteForm
