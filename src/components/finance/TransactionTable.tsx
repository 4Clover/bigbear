'use client'

import { useTransition } from 'react'
import { Paperclip } from 'lucide-react'
import { deleteTransaction } from '@/actions/finance'
import { formatCurrency, formatDate } from '@/lib/format'
import { Pagination } from '@/components/ui/Pagination'
import type { Transaction, ExpenseCategory, Receipt } from '@prisma/client'

type TransactionWithRelations = Omit<Transaction, 'amount'> & {
  amount: number
  category: ExpenseCategory
  receipts: Receipt[]
}

interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  page: number
  totalPages: number
  total: number
  pageSize: number
  onViewReceipts?: (transaction: TransactionWithRelations) => void
}

export const TransactionTable = ({
  transactions,
  page,
  totalPages,
  total,
  pageSize,
  onViewReceipts,
}: TransactionTableProps) => {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    startTransition(async () => {
      try {
        await deleteTransaction(id)
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        alert('Failed to delete transaction')
      }
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receipts
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-muted/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {formatDate(transaction.date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    transaction.type === 'INCOME'
                      ? 'bg-forest-100 text-forest-800 dark:bg-forest-900/30 dark:text-forest-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {transaction.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {transaction.category.name}
              </td>
              <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                {transaction.description ?? '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {transaction.vendor ?? '-'}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                  transaction.type === 'INCOME' ? 'text-forest-600 dark:text-forest-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {transaction.type === 'EXPENSE' ? '-' : '+'}
                {formatCurrency(transaction.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {transaction.receipts.length > 0 ? (
                  <button
                    onClick={() => onViewReceipts?.(transaction)}
                    className="text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300"
                  >
                    <Paperclip className="w-5 h-5 inline" />
                    <span className="ml-1">{transaction.receipts.length}</span>
                  </button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => {
                    handleDelete(transaction.id)
                  }}
                  disabled={isPending}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </div>
  )
}
