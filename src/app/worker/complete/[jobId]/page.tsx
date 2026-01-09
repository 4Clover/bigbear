'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMaintenanceJob } from '@/actions/maintenance'
import CompletionForm from '@/components/worker/CompletionForm'
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

const WorkerCompletePage = () => {
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadJob = async () => {
      try {
        const data = await getMaintenanceJob(jobId)
        if (!data) {
          setError('Job not found')
        } else if (!['SCHEDULED', 'IN_PROGRESS'].includes(data.status)) {
          setError('This job cannot be completed')
        } else {
          setJob(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job')
      } finally {
        setIsLoading(false)
      }
    }
    void loadJob()
  }, [jobId])

  const handleSuccess = () => {
    router.push('/worker/jobs')
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading job...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="mt-4 text-red-700">{error || 'Job not found'}</p>
          <button
            onClick={() => { router.push('/worker/jobs'); }}
            className="mt-4 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={handleCancel}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back
      </button>

      <CompletionForm
        jobId={job.id}
        jobTitle={job.title}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default WorkerCompletePage
