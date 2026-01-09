'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMaintenanceJobs, getWorkers, cancelJob } from '@/actions/maintenance'
import JobList from '@/components/maintenance/JobList'
import JobForm from '@/components/maintenance/JobForm'
import QuoteReview from '@/components/maintenance/QuoteReview'
import CompletionReview from '@/components/maintenance/CompletionReview'
import WorkerList from '@/components/maintenance/WorkerList'
import InviteWorkerForm from '@/components/maintenance/InviteWorkerForm'
import type { Prisma } from '@prisma/client'

// Use Prisma's generated types for accurate type inference
type Job = Prisma.MaintenanceJobGetPayload<{
  include: {
    quotes: { include: { worker: { include: { user: true } } } }
    workCompletions: { include: { worker: { include: { user: true } } } }
    assignedWorker: { include: { user: true } }
  }
}>

type WorkerProfile = Prisma.WorkerProfileGetPayload<{
  include: {
    user: true
    _count: { select: { quotes: true; workCompletions: true; assignedJobs: true } }
  }
}>

type ActiveModal =
  | { type: 'createJob' }
  | { type: 'quotes'; job: Job }
  | { type: 'completion'; job: Job }
  | { type: 'inviteWorker' }
  | null

const OwnerMaintenancePage = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'workers'>('jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const loadJobs = useCallback(async () => {
    try {
      const data = await getMaintenanceJobs()
      setJobs(data)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }, [])

  const loadWorkers = useCallback(async () => {
    try {
      const data = await getWorkers()
      setWorkers(data)
    } catch (error) {
      console.error('Failed to load workers:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([loadJobs(), loadWorkers()])
      setIsLoading(false)
    }
    void loadData()
  }, [loadJobs, loadWorkers])

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return
    try {
      await cancelJob(jobId)
      await loadJobs()
    } catch (error) {
      console.error('Failed to cancel job:', error)
      alert('Failed to cancel job')
    }
  }

  const handleModalSuccess = async () => {
    setActiveModal(null)
    await Promise.all([loadJobs(), loadWorkers()])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <div className="flex gap-2">
          {activeTab === 'jobs' && (
            <button
              onClick={() => { setActiveModal({ type: 'createJob' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Job
            </button>
          )}
          {activeTab === 'workers' && (
            <button
              onClick={() => { setActiveModal({ type: 'inviteWorker' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Invite Worker
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('jobs'); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'jobs'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => { setActiveTab('workers'); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Workers ({workers.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' && (
        <JobList
          jobs={jobs}
          onViewQuotes={(job) => { setActiveModal({ type: 'quotes', job }); }}
          onViewCompletion={(job) => { setActiveModal({ type: 'completion', job }); }}
          onCancel={(jobId) => { void handleCancelJob(jobId); }}
        />
      )}

      {activeTab === 'workers' && (
        <WorkerList workers={workers} onRefresh={() => { void loadWorkers(); }} />
      )}

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg">
            {activeModal.type === 'createJob' && (
              <JobForm
                onSuccess={() => { void handleModalSuccess(); }}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
            {activeModal.type === 'quotes' && (
              <QuoteReview
                jobTitle={activeModal.job.title}
                quotes={activeModal.job.quotes}
                onSuccess={() => { void handleModalSuccess(); }}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
            {activeModal.type === 'completion' && (
              <CompletionReview
                jobTitle={activeModal.job.title}
                completions={activeModal.job.workCompletions}
                jobStatus={activeModal.job.status}
                onSuccess={() => { void handleModalSuccess(); }}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
            {activeModal.type === 'inviteWorker' && (
              <InviteWorkerForm
                onSuccess={() => { void handleModalSuccess(); }}
                onCancel={() => { setActiveModal(null); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerMaintenancePage
