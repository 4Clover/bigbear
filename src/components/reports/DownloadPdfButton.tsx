'use client'

import { useState } from 'react'

type ReportType = 'monthly' | 'annual' | 'schedule-e'

interface DownloadPdfButtonProps {
  type: ReportType
  year: number
  month?: number
}

export const DownloadPdfButton = ({ type, year, month }: DownloadPdfButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type, year: year.toString() })
      if (month) params.set('month', month.toString())

      const response = await fetch(`/api/reports/pdf?${params.toString()}`)
      if (!response.ok) throw new Error('PDF generation failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      let filename = `report-${year}`
      if (type === 'monthly' && month) filename += `-${month.toString().padStart(2, '0')}`
      filename += `-${type}.pdf`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download failed:', error)
      alert('Failed to generate PDF')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={() => { void handleDownload(); }}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 border border-emerald-600 rounded-lg text-sm font-medium text-emerald-600 bg-white hover:bg-emerald-50 disabled:opacity-50"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      {isLoading ? 'Generating...' : 'Download PDF'}
    </button>
  )
}
