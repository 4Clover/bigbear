'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAssignedJobs, startWork } from '@/actions/maintenance'
import type { JobPriority, JobStatus } from '@prisma/client'

type Job = {
  id: string
  title: string
  description: string | null
  priority: JobPriority
  status: JobStatus
  dueDate: Date | null
  scheduledDate: Date | null
  scheduledTime: string | null
  images: string[]
}

const priorityColors: Record<JobPriority, string> = {
  LOW: 'border-l-gray-400',
  MEDIUM: 'border-l-blue-400',
  HIGH: 'border-l-orange-400',
  URGENT: 'border-l-red-400',
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

const WorkerSchedulePage = () => {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadJobs = useCallback(async () => {
    try {
      const data = await getAssignedJobs()
      setJobs(data)
    } catch (error) {
      console.error('Failed to load schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const handleStart = async (jobId: string) => {
    try {
      await startWork(jobId)
      await loadJobs()
    } catch (error) {
      console.error('Failed to start work:', error)
      alert('Failed to start work')
    }
  }

  const handleComplete = (jobId: string) => {
    router.push(`/worker/complete/${jobId}`)
  }

  // Group jobs by date
  const scheduledJobs = jobs.filter((j) => j.scheduledDate && ['SCHEDULED', 'IN_PROGRESS'].includes(j.status))
  const unscheduledJobs = jobs.filter((j) => !j.scheduledDate && j.status === 'ASSIGNED')

  const jobsByDate = scheduledJobs.reduce(
    (acc, job) => {
      const dateKey = new Date(job.scheduledDate!).toISOString().split('T')[0] ?? ''
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey]!.push(job)
      return acc
    },
    {} as Record<string, Job[]>
  )

  const sortedDates = Object.keys(jobsByDate).sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Schedule</h1>

      {/* Unscheduled Jobs */}
      {unscheduledJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Needs Scheduling ({unscheduledJobs.length})
          </h2>
          <div className="space-y-2">
            {unscheduledJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-white rounded-lg border-l-4 ${priorityColors[job.priority]} border border-gray-200 p-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    {job.dueDate && (
                      <p className="text-sm text-gray-500">Due: {formatDate(job.dueDate)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push('/worker/jobs')}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Jobs by Date */}
      {sortedDates.length > 0 ? (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {formatDate(new Date(date))}
              </h2>
              <div className="space-y-2">
                {jobsByDate[date]?.map((job) => (
                  <div
                    key={job.id}
                    className={`bg-white rounded-lg border-l-4 ${priorityColors[job.priority]} border border-gray-200 p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{job.title}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              job.status === 'IN_PROGRESS'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {job.status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{job.scheduledTime}</p>
                      </div>
                      <div className="flex gap-2">
                        {job.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleStart(job.id)}
                            className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleComplete(job.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : unscheduledJobs.length === 0 ? (
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600">No scheduled jobs</p>
        </div>
      ) : null}
    </div>
  )
}

export default WorkerSchedulePage
