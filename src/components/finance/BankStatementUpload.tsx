'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

//|--------------------------------|
//| %%% BANK STATEMENT SCAFFOLDING |
//| TODO: Implement PDF parsing,   |
//| transaction extraction, and    |
//| Vercel Blob storage when ready.|
//|--------------------------------|

interface SelectedFile {
  file: File
  id: string
}

export const BankStatementUpload = () => {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (fileList: FileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf')
    const newFiles = pdfs.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bank Statements</h2>
          <p className="text-sm text-muted-foreground">
            Upload PDF bank statements for record keeping and transaction extraction
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          role="button"
          tabIndex={0}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-forest-500 bg-forest-50 dark:bg-forest-950/30'
              : 'border-border hover:border-forest-400 hover:bg-muted/30'
          }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => {
            setIsDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
          }}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drag & drop PDF files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF files only, max 20MB each</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Selected files ({files.length})</h3>
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-forest-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(f.file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeFile(f.id)
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 pt-2">
              <Button disabled>
                Upload {files.length} {files.length === 1 ? 'Statement' : 'Statements'}
              </Button>
              <span className="text-xs text-muted-foreground italic">
                Upload and parsing coming soon
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Uploaded Statements</h3>
          <p className="text-sm text-muted-foreground italic">
            No bank statements uploaded yet. Uploaded statements and extracted transactions will
            appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
