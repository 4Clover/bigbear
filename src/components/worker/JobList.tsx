'use client'

import type { JobPriority, JobStatus } from '@prisma/client'
import JobCard from './JobCard'

interface Job {
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

interface JobListProps {
  jobs: Job[]
  emptyMessage?: string
  onQuote?: (jobId: string) => void
  onSchedule?: (jobId: string) => void
  onStart?: (jobId: string) => void
  onComplete?: (jobId: string) => void
  showActions?: boolean
}

const JobList = ({
  jobs,
  emptyMessage = 'No jobs found',
  onQuote,
  onSchedule,
  onStart,
  onComplete,
  showActions = true,
}: JobListProps) => {
  if (jobs.length === 0) {
    return (
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="mt-4 text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onQuote={onQuote}
          onSchedule={onSchedule}
          onStart={onStart}
          onComplete={onComplete}
          showActions={showActions}
        />
      ))}
    </div>
  )
}

export default JobList
