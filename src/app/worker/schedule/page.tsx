'use client'

import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Calendar } from 'lucide-react'
import { getAssignedJobs, startWork } from '@/actions/maintenance'
import type { JobPriority, JobStatus } from '@prisma/client'

interface Job {
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
  LOW: 'border-l-stone-400',
  MEDIUM: 'border-l-wood-400',
  HIGH: 'border-l-amber-500',
  URGENT: 'border-l-red-500',
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState only fires after the awaited fetch resolves
    void loadJobs()
  }, [loadJobs])

  const handleStart = async (jobId: string) => {
    try {
      await startWork(jobId)
      await loadJobs()
    } catch (error) {
      console.error('Failed to start work:', error)
      toast.error('Failed to start work')
    }
  }

  const handleComplete = (jobId: string) => {
    router.push(`/worker/complete/${jobId}`)
  }

  // Group jobs by date
  const scheduledJobs = jobs.filter(
    (j) => j.scheduledDate && ['SCHEDULED', 'IN_PROGRESS'].includes(j.status)
  )
  const unscheduledJobs = jobs.filter((j) => !j.scheduledDate && j.status === 'ASSIGNED')

  const jobsByDate = scheduledJobs.reduce<Record<string, Job[]>>((acc, job) => {
    // scheduledDate is guaranteed non-null due to filter above
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const scheduledDate = job.scheduledDate as Date
    const dateKey = new Date(scheduledDate).toISOString().split('T')[0] ?? ''
    acc[dateKey] ??= []
    acc[dateKey].push(job)
    return acc
  }, {})

  const sortedDates = Object.keys(jobsByDate).sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Schedule</h1>

      {/* Unscheduled Jobs */}
      {unscheduledJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Needs Scheduling ({unscheduledJobs.length})
          </h2>
          <div className="space-y-2">
            {unscheduledJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-card rounded-lg border-l-4 ${priorityColors[job.priority]} border border-border p-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{job.title}</h3>
                    {job.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(job.dueDate)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      router.push('/worker/jobs')
                    }}
                    className="px-3 py-1.5 bg-wood-600 text-white text-sm font-medium rounded hover:bg-wood-700 transition-colors"
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
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {formatDate(new Date(date))}
              </h2>
              <div className="space-y-2">
                {jobsByDate[date]?.map((job) => (
                  <div
                    key={job.id}
                    className={`bg-card rounded-lg border-l-4 ${priorityColors[job.priority]} border border-border p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{job.title}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              job.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-wood-100 text-wood-700 dark:bg-wood-900/30 dark:text-wood-400'
                            }`}
                          >
                            {job.status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.scheduledTime}</p>
                      </div>
                      <div className="flex gap-2">
                        {job.status === 'SCHEDULED' && (
                          <button
                            onClick={() => {
                              void handleStart(job.id)
                            }}
                            className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleComplete(job.id)
                          }}
                          className="px-3 py-1.5 bg-forest-600 text-white text-sm font-medium rounded hover:bg-forest-700 transition-colors"
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
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No scheduled jobs</p>
        </div>
      ) : null}
    </div>
  )
}

export default WorkerSchedulePage
