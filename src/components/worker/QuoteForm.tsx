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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Submit Quote for: {jobTitle}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Quote Amount ($) *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Days to Complete
          </label>
          <input
            type="number"
            id="estimatedDays"
            name="estimatedDays"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="1"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description / Notes
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what the quote includes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quote'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default QuoteForm
