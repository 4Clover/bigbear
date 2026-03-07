'use client'

import { useEffect, useState } from 'react'
import { generateScheduleEReport } from '@/actions/reports'
import { HandsontableWrapper } from '@/components/finance/HandsontableWrapper'

interface SchedulESummarySheetProps {
  year: number
}

export function SchedulESummarySheet({ year }: SchedulESummarySheetProps) {
  const [data, setData] = useState<unknown[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const report = await generateScheduleEReport(year)
        const rows: unknown[][] = report.lineItems.map((item) => [
          item.line,
          item.categories.join(', '),
          item.total,
          item.transactions.length,
        ])
        const totalCount = report.lineItems.reduce((sum, item) => sum + item.transactions.length, 0)
        rows.push(['', 'TOTAL', report.totalExpenses, totalCount])
        setData(rows)
      } catch (err) {
        console.error('Failed to load Schedule E data:', err)
        setError('Failed to load Schedule E summary')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [year])

  const colHeaders = ['Line #', 'Category', 'Total Amount', 'Count']
  const columns = [
    { readOnly: true },
    { readOnly: true },
    { readOnly: true, type: 'numeric', numericFormat: { pattern: '$0,0.00' } },
    { readOnly: true, type: 'numeric' },
  ]

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-lg h-64" />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <HandsontableWrapper
      data={data}
      colHeaders={colHeaders}
      columns={columns}
      readOnly
      height={400}
    />
  )
}
