'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'

interface BookingFiltersProps {
  currentStatus?: string
  currentSearch?: string
  currentFrom?: string
  currentTo?: string
}

const statuses = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

const BookingFilters = ({
  currentStatus,
  currentSearch,
  currentFrom,
  currentTo,
}: BookingFiltersProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch ?? '')

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/owner/bookings?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams('search', search || null)
  }

  const selectedStatuses = currentStatus?.split(',') ?? []

  const toggleStatus = (status: string) => {
    let newStatuses: string[]
    if (selectedStatuses.includes(status)) {
      newStatuses = selectedStatuses.filter((s) => s !== status)
    } else {
      newStatuses = [...selectedStatuses, status]
    }
    updateParams('status', newStatuses.length > 0 ? newStatuses.join(',') : null)
  }

  const clearFilters = () => {
    router.push('/owner/bookings')
    setSearch('')
  }

  const hasFilters = currentStatus ?? currentSearch ?? currentFrom ?? currentTo

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap gap-4 items-end">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value) }}
              placeholder="Guest name or email..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
            >
              Search
            </button>
          </div>
        </form>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input
            type="date"
            value={currentFrom ?? ''}
            onChange={(e) => { updateParams('from', e.target.value || null) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="date"
            value={currentTo ?? ''}
            onChange={(e) => { updateParams('to', e.target.value || null) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isSelected = selectedStatuses.includes(status.value)
            return (
              <button
                key={status.value}
                onClick={() => { toggleStatus(status.value) }}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {status.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BookingFilters
