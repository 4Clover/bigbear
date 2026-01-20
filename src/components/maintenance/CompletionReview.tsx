'use client'

import { useState } from 'react'
import Image from 'next/image'
import { approveWorkCompletion, markWorkerPaid } from '@/actions/maintenance'
import type { Prisma } from '@prisma/client'

type WorkCompletion = Prisma.WorkCompletionGetPayload<{
  include: { worker: { include: { user: true } } }
}>

interface CompletionReviewProps {
  jobTitle: string
  completions: WorkCompletion[]
  jobStatus: string
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

const CompletionReview = ({ jobTitle, completions, jobStatus, onSuccess, onCancel }: CompletionReviewProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (completionId: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await approveWorkCompletion(completionId)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve work')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkPaid = async (completionId: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await markWorkerPaid(completionId)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
      <h3 className="text-lg font-semibold text-foreground mb-2">Review Work Completion</h3>
      <p className="text-sm text-muted-foreground mb-4">Job: {jobTitle}</p>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {completions.map((completion) => (
          <div key={completion.id} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-medium text-foreground">
                  {completion.worker.businessName ?? completion.worker.user.name ?? completion.worker.user.email}
                </p>
                <p className="text-sm text-muted-foreground">Submitted: {formatDate(completion.submittedAt)}</p>
              </div>
              <div className="text-right">
                {completion.finalAmount && (
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(completion.finalAmount)}
                  </p>
                )}
                <div className="flex gap-2 mt-1">
                  {completion.isApproved && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-success/20 text-success rounded">
                      Approved
                    </span>
                  )}
                  {completion.isPaid && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                      Paid
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Proof Photos */}
            {completion.images.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Proof Photos:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {completion.images.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={url}
                        alt={`Proof ${index + 1}`}
                        width={200}
                        height={96}
                        className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              {completion.description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{completion.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {completion.hoursWorked && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Hours Worked</p>
                    <p className="text-sm text-foreground">{Number(completion.hoursWorked)}</p>
                  </div>
                )}
                {completion.materialsUsed && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Materials Used</p>
                    <p className="text-sm text-foreground">{completion.materialsUsed}</p>
                  </div>
                )}
              </div>

              {completion.unexpectedIssues && (
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="text-xs font-medium text-warning mb-1">Unexpected Issues</p>
                  <p className="text-sm text-foreground">{completion.unexpectedIssues}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {jobStatus === 'COMPLETED' && !completion.isApproved && (
                <button
                  onClick={() => { void handleApprove(completion.id); }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Approving...' : 'Approve Work'}
                </button>
              )}
              {jobStatus === 'APPROVED' && completion.isApproved && !completion.isPaid && (
                <button
                  onClick={() => { void handleMarkPaid(completion.id); }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Mark as Paid'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default CompletionReview
