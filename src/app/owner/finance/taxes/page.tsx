'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HandsontableWrapper } from '@/components/finance/HandsontableWrapper'
import { SchedulESummarySheet } from '@/components/finance/SchedulESummarySheet'

const TaxesPage = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'schedule-e'>('transactions')
  const [year, setYear] = useState(new Date().getFullYear())

  const placeholderData: unknown[][] = []
  const colHeaders = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Notes']

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/owner/finance"
          className="text-sm text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300 font-medium"
        >
          &larr; Back to Finance
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Taxes</h1>
        <p className="text-muted-foreground">Manage tax documents and Schedule E summary</p>
      </div>

      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('transactions')
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => {
              setActiveTab('schedule-e')
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'schedule-e'
                ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Schedule E Summary
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="tax-year" className="text-sm font-medium text-muted-foreground">
            Year:
          </label>
          <select
            id="tax-year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value))
            }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <HandsontableWrapper data={placeholderData} colHeaders={colHeaders} height={500} />
          </div>
        )}

        {activeTab === 'schedule-e' && <SchedulESummarySheet year={year} />}
      </div>
    </div>
  )
}

export default TaxesPage
