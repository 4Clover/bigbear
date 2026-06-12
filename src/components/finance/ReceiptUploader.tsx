'use client'

import { toast } from 'sonner'
import { useState, useRef, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import type { PutBlobResult } from '@vercel/blob'

interface UploadedReceipt {
  url: string
  fileName: string
}

interface ReceiptUploaderProps {
  onUpload: (receipts: UploadedReceipt[]) => void
  existingReceipts?: UploadedReceipt[]
}

export const ReceiptUploader = ({ onUpload, existingReceipts = [] }: ReceiptUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>(existingReceipts)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      setIsUploading(true)

      try {
        const newReceipts: UploadedReceipt[] = []

        for (const file of Array.from(files)) {
          const blob: PutBlobResult = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload/receipts',
          })

          newReceipts.push({
            url: blob.url,
            fileName: file.name,
          })
        }

        const updated = [...uploadedReceipts, ...newReceipts]
        setUploadedReceipts(updated)
        onUpload(updated)
      } catch (error) {
        console.error('Upload failed:', error)
        toast.error('Failed to upload files')
      } finally {
        setIsUploading(false)
      }
    },
    [uploadedReceipts, onUpload]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeReceipt = (index: number) => {
    const updated = uploadedReceipts.filter((_, i) => i !== index)
    setUploadedReceipts(updated)
    onUpload(updated)
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          transition-colors cursor-pointer
          ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-muted-foreground'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
          />
        </svg>

        <p className="mt-2 text-sm text-muted-foreground">
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, or PDF up to 10MB</p>
      </div>

      {uploadedReceipts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Uploaded files:</p>
          <ul className="space-y-2">
            {uploadedReceipts.map((receipt, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
              >
                <a
                  href={receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 truncate max-w-xs"
                >
                  {receipt.fileName}
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeReceipt(index)
                  }}
                  className="text-destructive hover:text-destructive/80 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
