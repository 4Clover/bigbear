'use client'

import { useState, useEffect } from 'react'
import { FileText, Calendar, Clock } from 'lucide-react'
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
        <div className="text-muted-foreground">Loading quotes...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Quotes</h1>

      {quotes.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">You haven&apos;t submitted any quotes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-card rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {quote.job.title}
                  </h3>
                  {quote.job.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {quote.job.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(quote.amount)}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      quote.isApproved
                        ? 'bg-forest-100 text-forest-700 dark:bg-forest-900/30 dark:text-forest-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}
                  >
                    {quote.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Submitted: {formatDate(quote.submittedAt)}</span>
                </div>
                {quote.estimatedDays && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Est. {quote.estimatedDays} day(s)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      quote.job.status === 'ASSIGNED'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : quote.job.status === 'OPEN' || quote.job.status === 'QUOTED'
                          ? 'bg-wood-100 text-wood-700 dark:bg-wood-900/30 dark:text-wood-400'
                          : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    Job: {quote.job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {quote.description && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-foreground">{quote.description}</p>
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
