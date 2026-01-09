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
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const statusColors: Record<JobStatus, string> = {
  OPEN: 'bg-green-100 text-green-700',
  QUOTED: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-purple-100 text-purple-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-teal-100 text-teal-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
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
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
          {job.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{job.description}</p>
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

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
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
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              Submit Quote
            </button>
          )}
          {job.status === 'ASSIGNED' && onSchedule && (
            <button
              onClick={() => { onSchedule(job.id); }}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
            >
              Book Timeslot
            </button>
          )}
          {job.status === 'SCHEDULED' && onStart && (
            <button
              onClick={() => { onStart(job.id); }}
              className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors"
            >
              Start Work
            </button>
          )}
          {(job.status === 'SCHEDULED' || job.status === 'IN_PROGRESS') && onComplete && (
            <button
              onClick={() => { onComplete(job.id); }}
              className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
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
