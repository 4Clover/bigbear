'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import type { ExpenseCategory } from '@prisma/client'

interface TransactionFiltersProps {
  categories: ExpenseCategory[]
  currentType?: string
  currentCategoryId?: string
  currentSearch?: string
  currentFrom?: string
  currentTo?: string
}

const transactionTypes = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
]

export const TransactionFilters = ({
  categories,
  currentType,
  currentCategoryId,
  currentSearch,
  currentFrom,
  currentTo,
}: TransactionFiltersProps) => {
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
      router.push(`/owner/finance?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams('search', search || null)
  }

  const clearFilters = () => {
    router.push('/owner/finance')
    setSearch('')
  }

  const hasFilters = currentType ?? currentCategoryId ?? currentSearch ?? currentFrom ?? currentTo

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap gap-4 items-end">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              placeholder="Description or vendor..."
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={currentType ?? ''}
            onChange={(e) => { updateParams('type', e.target.value || null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            <option value="">All types</option>
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={currentCategoryId ?? ''}
            onChange={(e) => { updateParams('categoryId', e.target.value || null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input
            type="date"
            value={currentFrom ?? ''}
            onChange={(e) => { updateParams('from', e.target.value || null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="date"
            value={currentTo ?? ''}
            onChange={(e) => { updateParams('to', e.target.value || null); }}
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
    </div>
  )
}
