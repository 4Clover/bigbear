'use client'

import { useTransition } from 'react'
import { deleteTransaction } from '@/actions/finance'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Transaction, ExpenseCategory, Receipt } from '@prisma/client'

type TransactionWithRelations = Transaction & {
  category: ExpenseCategory
  receipts: Receipt[]
}

interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  onViewReceipts?: (transaction: TransactionWithRelations) => void
}

export const TransactionTable = ({ transactions, onViewReceipts }: TransactionTableProps) => {
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Receipts
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(transaction.date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    transaction.type === 'INCOME'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {transaction.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.category.name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {transaction.description || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {transaction.vendor || '-'}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                  transaction.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {transaction.type === 'EXPENSE' ? '-' : '+'}
                {formatCurrency(Number(transaction.amount))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {transaction.receipts.length > 0 ? (
                  <button
                    onClick={() => onViewReceipts?.(transaction)}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <svg
                      className="w-5 h-5 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span className="ml-1">{transaction.receipts.length}</span>
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => handleDelete(transaction.id)}
                  disabled={isPending}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
