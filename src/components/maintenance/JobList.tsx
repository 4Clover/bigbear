'use client'

import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Prisma, JobPriority, JobStatus } from '@prisma/client'

type Job = Prisma.MaintenanceJobGetPayload<{
  include: {
    quotes: { include: { worker: { include: { user: true } } } }
    workCompletions: { include: { worker: { include: { user: true } } } }
    assignedWorker: { include: { user: true } }
  }
}>

interface JobListProps {
  jobs: Job[]
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onViewQuotes: (job: Job) => void
  onViewCompletion: (job: Job) => void
  onCancel: (jobId: string) => void
}

const priorityColors: Record<JobPriority, string> = {
  LOW: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  MEDIUM: 'bg-wood-100 text-wood-700 dark:bg-wood-900/30 dark:text-wood-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusColors: Record<JobStatus, string> = {
  OPEN: 'bg-forest-100 text-forest-700 dark:bg-forest-900/30 dark:text-forest-400',
  QUOTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SCHEDULED: 'bg-wood-100 text-wood-700 dark:bg-wood-900/30 dark:text-wood-400',
  IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  COMPLETED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  APPROVED: 'bg-forest-100 text-forest-700 dark:bg-forest-900/30 dark:text-forest-400',
  PAID: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const JobList = ({
  jobs,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onViewQuotes,
  onViewCompletion,
  onCancel,
}: JobListProps) => {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  if (jobs.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">No maintenance jobs found</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Job
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-muted/50">
                <td className="px-4 py-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-foreground truncate">{job.title}</p>
                    {job.description && (
                      <p className="text-sm text-muted-foreground truncate">{job.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[job.priority]}`}>
                    {job.priority}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[job.status]}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {formatDate(job.dueDate)}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {job.assignedWorker ? (
                    job.assignedWorker.user.name ?? job.assignedWorker.user.email
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {job.status === 'QUOTED' && job.quotes.length > 0 && (
                      <button
                        onClick={() => { onViewQuotes(job); }}
                        className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        View Quotes ({job.quotes.length})
                      </button>
                    )}
                    {job.status === 'COMPLETED' && job.workCompletions.length > 0 && (
                      <button
                        onClick={() => { onViewCompletion(job); }}
                        className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                      >
                        Review Work
                      </button>
                    )}
                    {job.status === 'APPROVED' && job.workCompletions.some(c => !c.isPaid) && (
                      <button
                        onClick={() => { onViewCompletion(job); }}
                        className="px-2 py-1 text-xs font-medium bg-forest-100 text-forest-700 dark:bg-forest-900/30 dark:text-forest-400 rounded hover:bg-forest-200 dark:hover:bg-forest-900/50 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                    {!['COMPLETED', 'APPROVED', 'PAID', 'CANCELLED'].includes(job.status) && (
                      <button
                        onClick={() => { onCancel(job.id); }}
                        className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => { onPageChange(page - 1); }}
              disabled={page <= 1}
              className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => { onPageChange(page + 1); }}
              disabled={page >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{start}</span> to{' '}
                <span className="font-medium text-foreground">{end}</span> of{' '}
                <span className="font-medium text-foreground">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => { onPageChange(page - 1); }}
                  disabled={page <= 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => { onPageChange(page + 1); }}
                  disabled={page >= totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobList
