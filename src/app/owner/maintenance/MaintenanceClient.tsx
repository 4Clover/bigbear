'use client'

import { useState, useCallback } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { getMaintenanceJobs, getWorkers, cancelJob } from '@/actions/maintenance'
import JobList from '@/components/maintenance/JobList'
import JobForm from '@/components/maintenance/JobForm'
import QuoteReview from '@/components/maintenance/QuoteReview'
import CompletionReview from '@/components/maintenance/CompletionReview'
import WorkerList from '@/components/maintenance/WorkerList'
import InviteWorkerForm from '@/components/maintenance/InviteWorkerForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
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

interface MaintenanceClientProps {
  initialJobs: PaginatedJobs
  initialWorkers: WorkerProfile[]
}

const MaintenanceClient = ({ initialJobs, initialWorkers }: MaintenanceClientProps) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'workers'>('jobs')
  const [paginatedJobs, setPaginatedJobs] = useState<PaginatedJobs>(initialJobs)
  const [workers, setWorkers] = useState<WorkerProfile[]>(initialWorkers)
  const [isLoading, setIsLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  const loadJobs = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const data = await getMaintenanceJobs(undefined, { page })
      setPaginatedJobs(data as PaginatedJobs)
    } catch (error) {
      console.error('Failed to load jobs:', error)
      toast.error('Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadWorkers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getWorkers()
      setWorkers(data)
    } catch (error) {
      console.error('Failed to load workers:', error)
      toast.error('Failed to load workers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    void loadJobs(newPage)
  }

  const initiateCancelJob = (jobId: string) => {
    setPendingCancelId(jobId)
    setConfirmOpen(true)
  }

  const executeCancelJob = async () => {
    if (!pendingCancelId) return
    setIsLoading(true)
    try {
      await cancelJob(pendingCancelId)
      await loadJobs(currentPage)
      toast.success('Job cancelled successfully')
    } catch (error) {
      console.error('Failed to cancel job:', error)
      toast.error('Failed to cancel job')
    } finally {
      setIsLoading(false)
      setConfirmOpen(false)
      setPendingCancelId(null)
    }
  }

  const handleModalSuccess = async () => {
    setActiveModal(null)
    setIsLoading(true)
    await Promise.all([loadJobs(currentPage), loadWorkers()])
    setIsLoading(false)
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
          onCancel={initiateCancelJob}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel Job"
        description="Are you sure you want to cancel this job? This action cannot be undone."
        confirmLabel="Cancel Job"
        cancelLabel="Keep Job"
        variant="destructive"
        onConfirm={executeCancelJob}
        isLoading={isLoading}
      />
    </div>
  )
}

export default MaintenanceClient
