'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

type ReportType = 'monthly' | 'annual' | 'schedule-e'

interface ReportSelectorProps {
  currentType: ReportType
  currentYear: number
  currentMonth?: number
}

export const ReportSelector = ({ currentType, currentYear, currentMonth }: ReportSelectorProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentYearNum = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYearNum - i)
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleTypeChange = (type: ReportType) => {
    const params = new URLSearchParams()
    params.set('type', type)
    params.set('year', currentYear.toString())
    if (type === 'monthly' && currentMonth) {
      params.set('month', currentMonth.toString())
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Report Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['monthly', 'annual', 'schedule-e'] as ReportType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentType === type
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {type === 'monthly' ? 'Monthly' : type === 'annual' ? 'Annual' : 'Schedule E'}
              </button>
            ))}
          </div>
        </div>

        {/* Year Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={currentYear}
            onChange={(e) => updateParams('year', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector (only for monthly reports) */}
        {currentType === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={currentMonth || new Date().getMonth() + 1}
              onChange={(e) => updateParams('month', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
