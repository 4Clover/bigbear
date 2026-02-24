'use client'

import { useState, useEffect, useTransition } from 'react'
import { Search, Paperclip } from 'lucide-react'
import { getTransactions } from '@/actions/finance'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Transaction, ExpenseCategory, Receipt } from '@prisma/client'

type TransactionWithRelations = Omit<Transaction, 'amount'> & {
  amount: number
  category: ExpenseCategory
  receipts: Receipt[]
}

interface MobileExpenseListProps {
  onAttachReceipt: (transaction: TransactionWithRelations) => void
}

export const MobileExpenseList = ({ onAttachReceipt }: MobileExpenseListProps) => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanedSearch = search.replace(/^\$/, '')
      setDebouncedSearch(cleanedSearch)
      setPage(1)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [search])

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getTransactions(
          { search: debouncedSearch || undefined, type: 'EXPENSE' },
          { page, pageSize: 10 }
        )

        const newTransactions = result.data

        if (page === 1) {
          setTransactions(newTransactions)
        } else {
          setTransactions((prev) => [...prev, ...newTransactions])
        }

        setHasMore(result.page < result.totalPages)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
      } finally {
        setIsLoadingMore(false)
      }
    })
  }, [debouncedSearch, page])

  const handleLoadMore = () => {
    if (!isPending && hasMore) {
      setIsLoadingMore(true)
      setPage((p) => p + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          placeholder="Search by amount or vendor..."
          className="w-full pl-10 pr-4 h-11 border border-border rounded-xl text-base bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400 focus:border-transparent outline-none"
        />
      </div>

      <div className="flex flex-col gap-4">
        {transactions.length === 0 && !isPending && (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border shadow-sm">
            No expenses found.
          </div>
        )}

        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-card rounded-xl shadow-sm border border-border p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-foreground">
                {formatDate(transaction.date)}
              </span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">
                {formatCurrency(transaction.amount)}
              </span>
            </div>

            <div className="text-base font-medium text-foreground truncate">
              {transaction.vendor ?? transaction.description ?? 'Unknown Vendor'}
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300">
                {transaction.category.name}
              </span>

              {transaction.receipts.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Paperclip className="w-4 h-4" />
                  {transaction.receipts.length}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                onAttachReceipt(transaction)
              }}
              className="mt-1 w-full h-11 min-h-[44px] flex items-center justify-center bg-forest-50 text-forest-700 hover:bg-forest-100 dark:bg-forest-900/30 dark:text-forest-400 dark:hover:bg-forest-900/50 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
            >
              Attach Receipt
            </button>
          </div>
        ))}
      </div>

      {hasMore && transactions.length > 0 && (
        <button
          onClick={handleLoadMore}
          disabled={isPending || isLoadingMore}
          className="w-full h-11 min-h-[44px] flex items-center justify-center border-2 border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 touch-manipulation mb-4"
        >
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}

      {isPending && !isLoadingMore && transactions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
      )}
    </div>
  )
}
