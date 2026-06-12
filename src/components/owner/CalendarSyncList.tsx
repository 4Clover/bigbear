'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { addCalendarSync, removeCalendarSync, toggleCalendarSync } from '@/actions/calendar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { CalendarSync } from '@prisma/client'

interface CalendarSyncListProps {
  syncs: CalendarSync[]
}

const CalendarSyncList = ({ syncs }: CalendarSyncListProps) => {
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)

  const handleAdd = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await addCalendarSync(name, icalUrl)
        setName('')
        setIcalUrl('')
        setShowAddForm(false)
      } catch (error) {
        console.error('Failed to add calendar sync:', error)
        toast.error('Failed to add calendar sync')
      }
    })
  }

  const handleRemove = (id: string) => {
    startTransition(async () => {
      try {
        await removeCalendarSync(id)
      } catch (error) {
        console.error('Failed to remove calendar sync:', error)
        toast.error('Failed to remove calendar sync')
      }
    })
  }

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleCalendarSync(id, !isActive)
      } catch (error) {
        console.error('Failed to toggle calendar sync:', error)
        toast.error('Failed to toggle calendar sync')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">External Calendars</h2>
          <p className="text-sm text-stone-600">Sync with Airbnb, VRBO, or other iCal calendars</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
          }}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
        >
          {showAddForm ? 'Cancel' : 'Add Calendar'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-stone-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">Calendar Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
                placeholder="e.g., Airbnb, VRBO"
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 mb-1">iCal URL</label>
              <input
                type="url"
                value={icalUrl}
                onChange={(e) => {
                  setIcalUrl(e.target.value)
                }}
                placeholder="https://..."
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !name || !icalUrl}
              className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Adding...' : 'Add Calendar'}
            </button>
          </div>
        </form>
      )}

      {syncs.length === 0 ? (
        <p className="text-stone-600 text-sm">
          No external calendars connected. Add one to sync availability.
        </p>
      ) : (
        <div className="space-y-3">
          {syncs.map((sync) => (
            <div
              key={sync.id}
              className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-950">{sync.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      sync.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {sync.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-sm text-stone-600 truncate mt-1">{sync.icalUrl}</p>
                {sync.lastSynced && (
                  <p className="text-xs text-stone-500 mt-1">
                    Last synced: {format(sync.lastSynced, 'MMM d, yyyy h:mm a')}
                  </p>
                )}
                {sync.lastError && (
                  <p className="text-xs text-red-500 mt-1">Error: {sync.lastError}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    handleToggle(sync.id, sync.isActive)
                  }}
                  disabled={isPending}
                  className="text-sm text-stone-700 hover:text-stone-950 disabled:opacity-50"
                >
                  {sync.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => {
                    setRemoveTargetId(sync.id)
                  }}
                  disabled={isPending}
                  className="text-sm text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={removeTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTargetId(null)
        }}
        title="Remove this calendar sync?"
        description="Externally synced blocked dates from this calendar will no longer update. This cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeTargetId) handleRemove(removeTargetId)
        }}
      />
    </div>
  )
}

export default CalendarSyncList
