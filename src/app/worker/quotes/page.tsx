'use client'

import { useState, useEffect } from 'react'
import { getWorkerQuotes } from '@/actions/maintenance'
import type { JobPriority, JobStatus } from '@prisma/client'

interface Quote {
  id: string
  amount: number
  description: string | null
  estimatedDays: number | null
  isApproved: boolean
  submittedAt: Date
  job: {
    id: string
    title: string
    description: string | null
    priority: JobPriority
    status: JobStatus
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const WorkerQuotesPage = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const data = await getWorkerQuotes()
        setQuotes(data as unknown as Quote[])
      } catch (error) {
        console.error('Failed to load quotes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void loadQuotes()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading quotes...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Quotes</h1>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600">You haven&apos;t submitted any quotes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {quote.job.title}
                  </h3>
                  {quote.job.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {quote.job.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(quote.amount)}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      quote.isApproved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {quote.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Submitted: {formatDate(quote.submittedAt)}</span>
                </div>
                {quote.estimatedDays && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Est. {quote.estimatedDays} day(s)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      quote.job.status === 'ASSIGNED'
                        ? 'bg-purple-100 text-purple-700'
                        : quote.job.status === 'OPEN' || quote.job.status === 'QUOTED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Job: {quote.job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {quote.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{quote.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkerQuotesPage
