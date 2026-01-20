'use client'

import { useState } from 'react'
import { updateWorkerProfile } from '@/actions/maintenance'
import type { Prisma } from '@prisma/client'

type Worker = Prisma.WorkerProfileGetPayload<{
  include: {
    user: true
    _count: { select: { quotes: true; workCompletions: true; assignedJobs: true } }
  }
}>

interface WorkerListProps {
  workers: Worker[]
  onRefresh: () => void
}

const WorkerList = ({ workers, onRefresh }: WorkerListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdateTrust = async (workerId: string, trustworthiness: number) => {
    setIsSubmitting(true)
    try {
      await updateWorkerProfile(workerId, { trustworthiness })
      onRefresh()
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (workerId: string, isActive: boolean) => {
    setIsSubmitting(true)
    try {
      await updateWorkerProfile(workerId, { isActive: !isActive })
      onRefresh()
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveNotes = async (workerId: string, notes: string) => {
    setIsSubmitting(true)
    try {
      await updateWorkerProfile(workerId, { notes })
      setEditingId(null)
      onRefresh()
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (workers.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="mt-4 text-muted-foreground">No workers found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {workers.map((worker) => (
        <div
          key={worker.id}
          className={`bg-card rounded-lg border ${worker.isActive ? 'border-border' : 'border-destructive/50 bg-destructive/5'} p-4`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {worker.businessName ?? worker.user.name ?? 'Unknown'}
                </h3>
                {!worker.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-destructive/20 text-destructive rounded">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{worker.user.email}</p>
              {worker.phoneNumber && (
                <p className="text-sm text-muted-foreground">{worker.phoneNumber}</p>
              )}
              {worker.services.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {worker.services.map((service, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => { void handleUpdateTrust(worker.id, star); }}
                    disabled={isSubmitting}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-5 h-5 ${
                        (worker.trustworthiness ?? 0) >= star
                          ? 'text-yellow-400'
                          : 'text-muted-foreground/40'
                      } hover:text-yellow-400 transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{worker._count.quotes} quotes</p>
                <p>{worker._count.workCompletions} completions</p>
                <p>{worker._count.assignedJobs} active jobs</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 pt-4 border-t border-border">
            {editingId === worker.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  void handleSaveNotes(worker.id, formData.get('notes') as string)
                }}
                className="space-y-2"
              >
                <textarea
                  name="notes"
                  defaultValue={worker.notes ?? ''}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Add notes about this worker..."
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); }}
                    className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground flex-1">
                  {worker.notes ?? <span className="italic">No notes</span>}
                </p>
                <button
                  onClick={() => { setEditingId(worker.id); }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Toggle Active */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => { void handleToggleActive(worker.id, worker.isActive); }}
              disabled={isSubmitting}
              className={`text-sm font-medium ${
                worker.isActive
                  ? 'text-destructive hover:text-destructive/80'
                  : 'text-primary hover:text-primary/80'
              } transition-colors`}
            >
              {worker.isActive ? 'Deactivate Worker' : 'Activate Worker'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default WorkerList
