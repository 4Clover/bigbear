'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { blockDates, unblockDates } from '@/actions/calendar'
import type { BlockedDate } from '@prisma/client'

interface BlockDateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRange?: { start: Date; end: Date } | null
  existingBlock?: BlockedDate | null
}

const BlockDateModal = ({ isOpen, onClose, selectedRange, existingBlock }: BlockDateModalProps) => {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState(existingBlock?.reason ?? '')
  const [startDate, setStartDate] = useState(
    selectedRange?.start ? format(selectedRange.start, 'yyyy-MM-dd') : ''
  )
  const [endDate, setEndDate] = useState(
    selectedRange?.end ? format(selectedRange.end, 'yyyy-MM-dd') : ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await blockDates(new Date(startDate), new Date(endDate), reason || undefined)
        onClose()
      } catch (error) {
        console.error('Failed to block dates:', error)
        alert('Failed to block dates')
      }
    })
  }

  const handleUnblock = () => {
    if (!existingBlock) return
    if (!confirm('Are you sure you want to unblock these dates?')) return

    startTransition(async () => {
      try {
        await unblockDates(existingBlock.id)
        onClose()
      } catch (error) {
        console.error('Failed to unblock dates:', error)
        alert('Failed to unblock dates')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {existingBlock ? 'Manage Blocked Dates' : 'Block Dates'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {existingBlock ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Currently blocked:</p>
                <p className="font-medium">
                  {format(existingBlock.startDate, 'MMM d, yyyy')} -{' '}
                  {format(existingBlock.endDate, 'MMM d, yyyy')}
                </p>
                {existingBlock.reason && (
                  <p className="text-sm text-gray-600 mt-1">Reason: {existingBlock.reason}</p>
                )}
              </div>
              <button
                onClick={handleUnblock}
                disabled={isPending}
                className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Unblocking...' : 'Unblock Dates'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                  }}
                  placeholder="e.g., Maintenance, Personal use, Holiday"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !startDate || !endDate}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? 'Blocking...' : 'Block Dates'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlockDateModal
