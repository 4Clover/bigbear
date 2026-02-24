'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HandsontableWrapper } from '@/components/finance/HandsontableWrapper'

const TaxesPage = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'schedule-e'>('transactions')

  const placeholderData: unknown[][] = []
  const colHeaders = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Notes']

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

      <div className="border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveTab('transactions') }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => { setActiveTab('schedule-e') }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'schedule-e'
                ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Schedule E Summary
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <HandsontableWrapper data={placeholderData} colHeaders={colHeaders} height={500} />
          </div>
        )}

        {activeTab === 'schedule-e' && (
          <div className="p-8 bg-card border border-border rounded-lg text-center">
            <p className="text-muted-foreground">Schedule E Summary — coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TaxesPage
