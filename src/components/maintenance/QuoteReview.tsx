'use client'

import { useState } from 'react'
import { acceptQuote } from '@/actions/maintenance'
import type { Prisma } from '@prisma/client'

type Quote = Prisma.QuoteGetPayload<{
  include: { worker: { include: { user: true } } }
}>

interface QuoteReviewProps {
  jobTitle: string
  quotes: Quote[]
  onSuccess: () => void
  onCancel: () => void
}

const formatCurrency = (amount: unknown) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount))
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const QuoteReview = ({ jobTitle, quotes, onSuccess, onCancel }: QuoteReviewProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async (quoteId: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await acceptQuote(quoteId)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept quote')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Quotes</h3>
      <p className="text-sm text-gray-600 mb-4">Job: {jobTitle}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {quote.worker.businessName || quote.worker.user.name || quote.worker.user.email}
                  </p>
                  {quote.worker.trustworthiness && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm text-gray-600">{quote.worker.trustworthiness}/5</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">{quote.worker.user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(quote.amount)}
                </p>
                {quote.estimatedDays && (
                  <p className="text-sm text-gray-500">{quote.estimatedDays} day(s)</p>
                )}
              </div>
            </div>

            {quote.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{quote.description}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">Submitted: {formatDate(quote.submittedAt)}</p>
              <button
                onClick={() => handleAccept(quote.id)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Accepting...' : 'Accept Quote'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default QuoteReview
