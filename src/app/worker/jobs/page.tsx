'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableJobs, getAssignedJobs, startWork } from '@/actions/maintenance'
import JobList from '@/components/worker/JobList'
import QuoteForm from '@/components/worker/QuoteForm'
import TimeslotPicker from '@/components/worker/TimeslotPicker'
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

const WorkerJobsPage = () => {
  const router = useRouter()
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'assigned'>('available')

  const loadJobs = useCallback(async () => {
    try {
      const [available, assigned] = await Promise.all([
        getAvailableJobs(),
        getAssignedJobs(),
      ])
      setAvailableJobs(available)
      setAssignedJobs(assigned)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

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

  const handleModalSuccess = () => {
    setActiveModal(null)
    void loadJobs()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading jobs...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Jobs</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => { setActiveTab('available'); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'available'
              ? 'border-wood-600 text-wood-600 dark:text-wood-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Available Jobs ({availableJobs.length})
        </button>
        <button
          onClick={() => { setActiveTab('assigned'); }}
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
          onStart={(jobId) => { void handleStart(jobId); }}
          onComplete={handleComplete}
        />
      )}

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            {activeModal.type === 'quote' && (
              <QuoteForm
                jobId={activeModal.jobId}
                jobTitle={activeModal.jobTitle}
                onSuccess={handleModalSuccess}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
            {activeModal.type === 'schedule' && (
              <TimeslotPicker
                jobId={activeModal.jobId}
                jobTitle={activeModal.jobTitle}
                onSuccess={handleModalSuccess}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerJobsPage
