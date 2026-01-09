'use client'

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
        <p className="mt-4 text-gray-600">No maintenance jobs found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{job.title}</p>
                    {job.description && (
                      <p className="text-sm text-gray-500 truncate">{job.description}</p>
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
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(job.dueDate)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
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
                        className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                      >
                        View Quotes ({job.quotes.length})
                      </button>
                    )}
                    {job.status === 'COMPLETED' && job.workCompletions.length > 0 && (
                      <button
                        onClick={() => { onViewCompletion(job); }}
                        className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition-colors"
                      >
                        Review Work
                      </button>
                    )}
                    {job.status === 'APPROVED' && job.workCompletions.some(c => !c.isPaid) && (
                      <button
                        onClick={() => { onViewCompletion(job); }}
                        className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                    {!['COMPLETED', 'APPROVED', 'PAID', 'CANCELLED'].includes(job.status) && (
                      <button
                        onClick={() => { onCancel(job.id); }}
                        className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => { onPageChange(page - 1); }}
              disabled={page <= 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => { onPageChange(page + 1); }}
              disabled={page >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{start}</span> to{' '}
                <span className="font-medium">{end}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => { onPageChange(page - 1); }}
                  disabled={page <= 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => { onPageChange(page + 1); }}
                  disabled={page >= totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
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
