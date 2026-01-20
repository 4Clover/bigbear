'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
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
        <div className="text-muted-foreground">Loading job...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-red-700 dark:text-red-400">{error ?? 'Job not found'}</p>
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
        className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
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
