'use client'

import type { JobPriority, JobStatus } from '@prisma/client'

interface JobCardProps {
  job: {
    id: string
    title: string
    description?: string | null
    priority: JobPriority
    status: JobStatus
    dueDate?: Date | null
    scheduledDate?: Date | null
    scheduledTime?: string | null
    images: string[]
  }
  onQuote?: (jobId: string) => void
  onSchedule?: (jobId: string) => void
  onStart?: (jobId: string) => void
  onComplete?: (jobId: string) => void
  showActions?: boolean
}

const priorityColors: Record<JobPriority, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-secondary/20 text-secondary',
  HIGH: 'bg-warning/20 text-warning',
  URGENT: 'bg-destructive/20 text-destructive',
}

const statusColors: Record<JobStatus, string> = {
  OPEN: 'bg-success/20 text-success',
  QUOTED: 'bg-warning/20 text-warning',
  ASSIGNED: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  SCHEDULED: 'bg-secondary/20 text-secondary',
  IN_PROGRESS: 'bg-warning/20 text-warning',
  COMPLETED: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
  APPROVED: 'bg-success/20 text-success',
  PAID: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/20 text-destructive',
}

const formatDate = (date: Date | null | undefined) => {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const JobCard = ({
  job,
  onQuote,
  onSchedule,
  onStart,
  onComplete,
  showActions = true,
}: JobCardProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{job.title}</h3>
          {job.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{job.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[job.priority]}`}>
            {job.priority}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[job.status]}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {job.dueDate && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Due: {formatDate(job.dueDate)}</span>
          </div>
        )}
        {job.scheduledDate && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              Scheduled: {formatDate(job.scheduledDate)}
              {job.scheduledTime && ` at ${job.scheduledTime}`}
            </span>
          </div>
        )}
        {job.images.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{job.images.length} photo(s)</span>
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.status === 'OPEN' && onQuote && (
            <button
              onClick={() => { onQuote(job.id); }}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded hover:bg-secondary/90 transition-colors"
            >
              Submit Quote
            </button>
          )}
          {job.status === 'ASSIGNED' && onSchedule && (
            <button
              onClick={() => { onSchedule(job.id); }}
              className="px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded hover:bg-violet-700 transition-colors"
            >
              Book Timeslot
            </button>
          )}
          {job.status === 'SCHEDULED' && onStart && (
            <button
              onClick={() => { onStart(job.id); }}
              className="px-3 py-1.5 bg-warning text-warning-foreground text-sm font-medium rounded hover:bg-warning/90 transition-colors"
            >
              Start Work
            </button>
          )}
          {(job.status === 'SCHEDULED' || job.status === 'IN_PROGRESS') && onComplete && (
            <button
              onClick={() => { onComplete(job.id); }}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors"
            >
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default JobCard
