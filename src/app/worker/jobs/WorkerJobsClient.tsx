'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableJobs, getAssignedJobs, startWork } from '@/actions/maintenance'
import JobList from '@/components/worker/JobList'
import QuoteForm from '@/components/worker/QuoteForm'
import TimeslotPicker from '@/components/worker/TimeslotPicker'
import { toast } from 'sonner'
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

type ActiveModal =
  | { type: 'quote'; jobId: string; jobTitle: string }
  | { type: 'schedule'; jobId: string; jobTitle: string }
  | null

interface WorkerJobsClientProps {
  initialAvailable: Job[]
  initialAssigned: Job[]
}

const WorkerJobsClient = ({ initialAvailable, initialAssigned }: WorkerJobsClientProps) => {
  const router = useRouter()
  const [availableJobs, setAvailableJobs] = useState<Job[]>(initialAvailable)
  const [assignedJobs, setAssignedJobs] = useState<Job[]>(initialAssigned)
  const [isLoading, setIsLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'assigned'>('available')

  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      const [available, assigned] = await Promise.all([getAvailableJobs(), getAssignedJobs()])
      setAvailableJobs(available)
      setAssignedJobs(assigned)
    } catch (error) {
      console.error('Failed to load jobs:', error)
      toast.error('Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleQuote = (jobId: string) => {
    const job = availableJobs.find((j) => j.id === jobId)
    if (job) {
      setActiveModal({ type: 'quote', jobId, jobTitle: job.title })
    }
  }

  const handleSchedule = (jobId: string) => {
    const job = assignedJobs.find((j) => j.id === jobId)
    if (job) {
      setActiveModal({ type: 'schedule', jobId, jobTitle: job.title })
    }
  }

  const handleStart = async (jobId: string) => {
    setIsLoading(true)
    try {
      await startWork(jobId)
      await loadJobs()
      toast.success('Work started successfully')
    } catch (error) {
      console.error('Failed to start work:', error)
      toast.error('Failed to start work')
      setIsLoading(false)
    }
  }

  const handleComplete = (jobId: string) => {
    router.push(`/worker/complete/${jobId}`)
  }

  const handleModalSuccess = () => {
    setActiveModal(null)
    void loadJobs()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Jobs</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('available')
          }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'available'
              ? 'border-wood-600 text-wood-600 dark:text-wood-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Available Jobs ({availableJobs.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('assigned')
          }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assigned'
              ? 'border-wood-600 text-wood-600 dark:text-wood-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Assigned to Me ({assignedJobs.length})
        </button>
      </div>

      {/* Job Lists */}
      <div className={isLoading ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
        {activeTab === 'available' && (
          <JobList
            jobs={availableJobs}
            emptyMessage="No available jobs at the moment"
            onQuote={handleQuote}
          />
        )}

        {activeTab === 'assigned' && (
          <JobList
            jobs={assignedJobs}
            emptyMessage="No jobs assigned to you"
            onSchedule={handleSchedule}
            onStart={(jobId) => {
              void handleStart(jobId)
            }}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            {activeModal.type === 'quote' && (
              <QuoteForm
                jobId={activeModal.jobId}
                jobTitle={activeModal.jobTitle}
                onSuccess={handleModalSuccess}
                onCancel={() => {
                  setActiveModal(null)
                }}
              />
            )}
            {activeModal.type === 'schedule' && (
              <TimeslotPicker
                jobId={activeModal.jobId}
                jobTitle={activeModal.jobTitle}
                onSuccess={handleModalSuccess}
                onCancel={() => {
                  setActiveModal(null)
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerJobsClient
