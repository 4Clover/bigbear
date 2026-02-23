'use client'

import { useState } from 'react'

interface ExportButtonProps {
  year: number
  month?: number
}

export const ExportButton = ({ year, month }: ExportButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ year: year.toString() })
      if (month) params.set('month', month.toString())

      const response = await fetch(`/api/reports/csv?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = month
        ? `transactions-${year}-${month.toString().padStart(2, '0')}.csv`
        : `transactions-${year}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_error) {
      console.error('Export failed:', _error)
      setError('Failed to export report')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => {
          void handleExport()
        }}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-800 bg-white hover:bg-stone-50 disabled:opacity-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {isLoading ? 'Exporting...' : 'Export CSV'}
      </button>
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
