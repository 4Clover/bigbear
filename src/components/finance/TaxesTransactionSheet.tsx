'use client'

import { useEffect, useState } from 'react'
import { getTransactions } from '@/actions/finance'
import { HandsontableWrapper } from '@/components/finance/HandsontableWrapper'
import { formatCurrency } from '@/lib/format'

interface TaxesTransactionSheetProps {
  year: number
}

export function TaxesTransactionSheet({ year }: TaxesTransactionSheetProps) {
  const [data, setData] = useState<unknown[][]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31)
        const result = await getTransactions(
          { type: 'EXPENSE', startDate, endDate },
          { page: 1, pageSize: 500 }
        )

        let sum = 0
        const rows: unknown[][] = result.data.map((t) => {
          sum += t.amount
          return [
            t.date.toISOString().slice(0, 10),
            t.category.name,
            t.vendor ?? '',
            t.description ?? '',
            t.amount,
            t.notes ?? '',
          ]
        })

        setData(rows)
        setTotal(sum)
      } catch (err) {
        console.error('Failed to load transactions:', err)
        setError('Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [year])

  const colHeaders = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Notes']
  const columns = [
    { readOnly: true },
    { readOnly: true },
    { readOnly: true },
    { readOnly: true },
    { readOnly: true, type: 'numeric', numericFormat: { pattern: '$0,0.00' } },
    { readOnly: true },
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
    <div className="space-y-4">
      <HandsontableWrapper
        data={data}
        colHeaders={colHeaders}
        columns={columns}
        readOnly
        height={500}
      />
      <div className="flex justify-end px-2">
        <p className="text-sm font-semibold text-foreground">Total: {formatCurrency(total)}</p>
      </div>
    </div>
  )
}
