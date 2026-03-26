'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

//|--------------------------------|
//| %%% EXCEL IMPORT SCAFFOLDING %%|
//| TODO: Implement xlsx parsing,  |
//| column mapping, preview table, |
//| and merge/overwrite logic.     |
//|--------------------------------|

interface ExcelImportFlowProps {
  categories: { id: string; name: string }[]
}

export const ExcelImportFlow = ({ categories: _categories }: ExcelImportFlowProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [mergeMode, setMergeMode] = useState<'merge' | 'overwrite'>('merge')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasFile = file !== null
  const hasPeriod = periodStart !== '' && periodEnd !== ''

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">1. Select Excel File</h2>

        <div
          role="button"
          tabIndex={0}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-forest-400 hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Click to upload an Excel file</p>
          <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files only</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </div>

        {hasFile && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="h-5 w-5 text-forest-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
              }}
              className="p-1 rounded hover:bg-muted transition-colors shrink-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">2. Select Time Period</h2>
        <p className="text-sm text-muted-foreground">
          Choose the date range this file covers. Transactions outside this range will be ignored.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="period-start"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Period Start
            </label>
            <input
              id="period-start"
              type="month"
              value={periodStart}
              onChange={(e) => {
                setPeriodStart(e.target.value)
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
            />
          </div>
          <div>
            <label htmlFor="period-end" className="block text-sm font-medium text-foreground mb-1">
              Period End
            </label>
            <input
              id="period-end"
              type="month"
              value={periodEnd}
              onChange={(e) => {
                setPeriodEnd(e.target.value)
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">3. Import Mode</h2>
        <p className="text-sm text-muted-foreground">
          Choose how to handle existing transactions in the selected time period.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            className={`flex flex-col gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              mergeMode === 'merge'
                ? 'border-forest-500 bg-forest-50 dark:bg-forest-950/30'
                : 'border-border hover:border-forest-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="mergeMode"
                value="merge"
                checked={mergeMode === 'merge'}
                onChange={() => {
                  setMergeMode('merge')
                }}
                className="text-forest-500 focus:ring-forest-500"
              />
              <span className="font-medium text-foreground">Merge</span>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Add new transactions and skip duplicates. Existing records are preserved.
            </p>
          </label>

          <label
            className={`flex flex-col gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              mergeMode === 'overwrite'
                ? 'border-forest-500 bg-forest-50 dark:bg-forest-950/30'
                : 'border-border hover:border-forest-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="mergeMode"
                value="overwrite"
                checked={mergeMode === 'overwrite'}
                onChange={() => {
                  setMergeMode('overwrite')
                }}
                className="text-forest-500 focus:ring-forest-500"
              />
              <span className="font-medium text-foreground">Overwrite</span>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Replace all transactions in the selected period with the uploaded data.
            </p>
          </label>
        </div>

        {mergeMode === 'overwrite' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-foreground">
              Overwrite mode will <strong>delete all existing transactions</strong> in the selected
              period before importing. This cannot be undone.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={!hasFile || !hasPeriod}>Import Transactions</Button>
        <span className="text-xs text-muted-foreground italic">
          Excel parsing and import coming soon
        </span>
      </div>
    </div>
  )
}
