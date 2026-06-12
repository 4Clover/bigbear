'use client'

import { toast } from 'sonner'
import { useState, useTransition, useEffect, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { updateTransaction, addReceiptToTransaction } from '@/actions/finance'
import { CategorySelect } from './CategorySelect'
import { ReceiptGallery } from './ReceiptGallery'
import { Button } from '@/components/ui/Button'
import { X, Camera, Image as ImageIcon, Upload } from 'lucide-react'
import type { ExpenseCategory, Receipt } from '@prisma/client'
interface TransactionEditModalProps {
  transaction: {
    id: string
    categoryId: string
    amount: number
    date: Date
    description?: string | null
    vendor?: string | null
    notes?: string | null
    receipts: Receipt[]
    category: { id: string; name: string }
  }
  categories: ExpenseCategory[]
  onClose: () => void
  onSuccess?: () => void
}

export const TransactionEditModal = ({
  transaction,
  categories,
  onClose,
  onSuccess,
}: TransactionEditModalProps) => {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [categoryId, setCategoryId] = useState(transaction.categoryId)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0])
  const [description, setDescription] = useState(transaction.description ?? '')
  const [vendor, setVendor] = useState(transaction.vendor ?? '')
  const [notes, setNotes] = useState(transaction.notes ?? '')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!categoryId || !amount || !date) {
      toast.error('Please fill in all required fields')
      return
    }

    startTransition(async () => {
      try {
        await updateTransaction(transaction.id, {
          categoryId,
          amount: parseFloat(amount),
          date: new Date(date),
          description: description || undefined,
          vendor: vendor || undefined,
        })
        onSuccess?.()
        onClose()
      } catch (error) {
        console.error('Failed to update:', error)
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/receipts',
        })

        await addReceiptToTransaction(transaction.id, {
          fileUrl: blob.url,
          fileName: file.name,
        })
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Edit Transaction</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
          <form id="edit-transaction-form" onSubmit={handleSubmit} className="space-y-6">
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                    }}
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
                  onChange={(e) => {
                    setDate(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vendor</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => {
                    setVendor(e.target.value)
                  }}
                  placeholder="e.g., Home Depot"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
                placeholder="What was this expense for?"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                }}
                placeholder="Additional notes"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </form>

          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-foreground">Receipts</h3>

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    void handleFileUpload(e)
                  }}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    void handleFileUpload(e)
                  }}
                />

                {isUploading ? (
                  <span className="text-sm text-muted-foreground flex items-center h-9 px-3">
                    Uploading...
                  </span>
                ) : (
                  <>
                    <div className="hidden md:flex">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Receipt
                      </Button>
                    </div>
                    <div className="flex md:hidden gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Library
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <ReceiptGallery receipts={transaction.receipts} canDelete={true} />
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-transaction-form" isLoading={isPending}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
