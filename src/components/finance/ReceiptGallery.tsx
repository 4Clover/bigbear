'use client'

import { useTransition } from 'react'
import { deleteReceipt } from '@/actions/finance'
import type { Receipt } from '@prisma/client'

interface ReceiptGalleryProps {
  receipts: Receipt[]
  canDelete?: boolean
}

export const ReceiptGallery = ({ receipts, canDelete = true }: ReceiptGalleryProps) => {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return

    startTransition(async () => {
      try {
        await deleteReceipt(receiptId)
      } catch (error) {
        console.error('Failed to delete receipt:', error)
        alert('Failed to delete receipt')
      }
    })
  }

  const isPdf = (url: string) => {
    return url.toLowerCase().endsWith('.pdf')
  }

  if (receipts.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No receipts attached</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {receipts.map((receipt) => (
        <div
          key={receipt.id}
          className="relative group border border-border rounded-lg overflow-hidden"
        >
          {isPdf(receipt.fileUrl) ? (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <svg className="w-12 h-12 text-destructive" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5z" />
              </svg>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receipt.fileUrl}
              alt={receipt.fileName}
              className="w-full h-32 object-cover"
            />
          )}

          <div className="p-2 bg-card">
            <p className="text-xs text-muted-foreground truncate">{receipt.fileName}</p>
          </div>

          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a
              href={receipt.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-card text-card-foreground text-xs font-medium rounded-lg hover:bg-muted"
            >
              View
            </a>
            {canDelete && (
              <button
                onClick={() => { handleDelete(receipt.id); }}
                disabled={isPending}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg hover:bg-destructive/90 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
