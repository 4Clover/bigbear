'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/actions/finance'
import { CategorySelect } from './CategorySelect'
import { ReceiptUploader } from './ReceiptUploader'
import { Button } from '@/components/ui/Button'
import type { ExpenseCategory } from '@prisma/client'

interface ExpenseFormProps {
  categories: ExpenseCategory[]
}

interface UploadedReceipt {
  url: string
  fileName: string
}

export const ExpenseForm = ({ categories }: ExpenseFormProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!categoryId || !amount || !date) {
      alert('Please fill in all required fields')
      return
    }

    startTransition(async () => {
      try {
        await createExpense({
          categoryId,
          amount: parseFloat(amount),
          date: new Date(date),
          description: description || undefined,
          vendor: vendor || undefined,
          receiptUrls: receipts.map((r) => r.url),
        })

        router.push('/owner/finance')
      } catch (error) {
        console.error('Failed to create expense:', error)
        alert('Failed to create expense')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category <span className="text-destructive">*</span>
            </label>
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Amount <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => { setVendor(e.target.value); }}
              placeholder="e.g., Home Depot"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            placeholder="What was this expense for?"
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Receipts</label>
          <ReceiptUploader onUpload={setReceipts} existingReceipts={receipts} />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => { router.back(); }} disabled={isPending} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} className="w-full sm:w-auto">
          Save Expense
        </Button>
      </div>
    </form>
  )
}
