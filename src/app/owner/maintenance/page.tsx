'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { getMaintenanceJobs, getWorkers, cancelJob } from '@/actions/maintenance'
import { DEFAULT_PAGE_SIZE } from '@/types/pagination'
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

interface PaginatedJobs {
  data: Job[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const OwnerMaintenancePage = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'workers'>('jobs')
  const [paginatedJobs, setPaginatedJobs] = useState<PaginatedJobs>({
    data: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  })
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadJobs = useCallback(async (page = 1) => {
    try {
      const data = await getMaintenanceJobs(undefined, { page })
      setPaginatedJobs(data as PaginatedJobs)
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
      await Promise.all([loadJobs(currentPage), loadWorkers()])
      setIsLoading(false)
    }
    void loadData()
  }, [loadJobs, loadWorkers, currentPage])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return
    try {
      await cancelJob(jobId)
      await loadJobs(currentPage)
    } catch (error) {
      console.error('Failed to cancel job:', error)
      alert('Failed to cancel job')
    }
  }

  const handleModalSuccess = async () => {
    setActiveModal(null)
    await Promise.all([loadJobs(currentPage), loadWorkers()])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
        <div className="flex gap-2">
          {activeTab === 'jobs' && (
            <button
              onClick={() => {
                setActiveModal({ type: 'createJob' })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Job
            </button>
          )}
          {activeTab === 'workers' && (
            <button
              onClick={() => {
                setActiveModal({ type: 'inviteWorker' })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Invite Worker
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('jobs')
          }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'jobs'
              ? 'border-forest-600 text-forest-600 dark:text-forest-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Jobs ({paginatedJobs.total})
        </button>
        <button
          onClick={() => {
            setActiveTab('workers')
          }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workers'
              ? 'border-forest-600 text-forest-600 dark:text-forest-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Workers ({workers.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' && (
        <JobList
          jobs={paginatedJobs.data}
          page={paginatedJobs.page}
          totalPages={paginatedJobs.totalPages}
          total={paginatedJobs.total}
          pageSize={paginatedJobs.pageSize}
          onPageChange={handlePageChange}
          onViewQuotes={(job) => {
            setActiveModal({ type: 'quotes', job })
          }}
          onViewCompletion={(job) => {
            setActiveModal({ type: 'completion', job })
          }}
          onCancel={(jobId) => {
            void handleCancelJob(jobId)
          }}
        />
      )}

      {activeTab === 'workers' && (
        <WorkerList
          workers={workers}
          onRefresh={() => {
            void loadWorkers()
          }}
        />
      )}

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg">
            {activeModal.type === 'createJob' && (
              <JobForm
                onSuccess={() => {
                  void handleModalSuccess()
                }}
                onCancel={() => {
                  setActiveModal(null)
                }}
              />
            )}
            {activeModal.type === 'quotes' && (
              <QuoteReview
                jobTitle={activeModal.job.title}
                quotes={activeModal.job.quotes}
                onSuccess={() => {
                  void handleModalSuccess()
                }}
                onCancel={() => {
                  setActiveModal(null)
                }}
              />
            )}
            {activeModal.type === 'completion' && (
              <CompletionReview
                jobTitle={activeModal.job.title}
                completions={activeModal.job.workCompletions}
                jobStatus={activeModal.job.status}
                onSuccess={() => {
                  void handleModalSuccess()
                }}
                onCancel={() => {
                  setActiveModal(null)
                }}
              />
            )}
            {activeModal.type === 'inviteWorker' && (
              <InviteWorkerForm
                onSuccess={() => {
                  void handleModalSuccess()
                }}
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

export default OwnerMaintenancePage
