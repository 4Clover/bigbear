'use client'

// IMPORTANT: Must be dynamically imported with ssr: false — Handsontable requires DOM APIs.

import { useState, useEffect, useCallback, useRef } from 'react'
import { HotTable } from '@handsontable/react-wrapper'
import type { CellChange, ChangeSource } from 'handsontable/common'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'

import {
  getTransactions,
  getExpenseCategories,
  updateTransaction,
  createExpense,
  deleteTransaction,
} from '@/actions/finance'

registerAllModules()

export function TaxesTransactionSheet() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  const dataRef = useRef<(string | number | null)[][]>([])
  const rowIdsRef = useRef<(string | null)[]>([])
  const pendingChangesRef = useRef<Map<string, { row: number; col: number; value: unknown }>>(
    new Map()
  )
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const cats = await getExpenseCategories()
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })))
      } catch (err) {
        console.error('Failed to load categories:', err)
      }
    })()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fetch state when `year` changes before the async reload
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await getTransactions(
          {
            type: 'EXPENSE',
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31, 23, 59, 59),
          },
          { page: 1, pageSize: 10000 }
        )

        const rows: (string | number | null)[][] = result.data.map((t) => {
          const raw = t.date instanceof Date ? t.date.toISOString() : String(t.date)
          const dateStr = raw.split('T')[0] ?? ''
          return [
            dateStr,
            t.category.name,
            t.vendor ?? null,
            t.description ?? null,
            t.amount,
            t.notes ?? null,
          ]
        })

        dataRef.current = rows
        rowIdsRef.current = result.data.map((t) => t.id)

        const sum = rows.reduce((acc, row) => {
          const val = row[4]
          return acc + (typeof val === 'number' ? val : 0)
        }, 0)
        setTotal(sum)
        setDataVersion((v) => v + 1)
      } catch (err) {
        console.error('Failed to load transactions:', err)
        setError('Failed to load transactions')
      } finally {
        setLoading(false)
      }
    })()
  }, [year])

  const categoryNames = categories.map((c) => c.name)

  const getCategoryId = useCallback(
    (name: string): string | null => {
      const cat = categories.find((c) => c.name === name)
      return cat?.id ?? null
    },
    [categories]
  )

  const recomputeTotal = useCallback(() => {
    const sum = dataRef.current.reduce((acc, row) => {
      const val = row[4]
      return acc + (typeof val === 'number' ? val : 0)
    }, 0)
    setTotal(sum)
  }, [])

  const flushPendingChanges = useCallback(() => {
    const pending = new Map(pendingChangesRef.current)
    pendingChangesRef.current.clear()

    const byRow = new Map<number, Map<number, unknown>>()
    for (const { row, col, value } of pending.values()) {
      let colMap = byRow.get(row)
      if (!colMap) {
        colMap = new Map()
        byRow.set(row, colMap)
      }
      colMap.set(col, value)
    }

    void (async () => {
      for (const [row, colChanges] of byRow) {
        const existingId = rowIdsRef.current[row]
        const rowData = dataRef.current[row]
        if (!rowData) continue

        if (existingId) {
          const payload: {
            categoryId?: string
            amount?: number
            date?: Date
            description?: string
            vendor?: string
          } = {}

          for (const [col, value] of colChanges) {
            const strVal =
              typeof value === 'string' || typeof value === 'number' ? String(value) : ''
            if (col === 0 && value != null) {
              payload.date = new Date(strVal)
            }
            if (col === 1 && value != null) {
              const catId = getCategoryId(strVal)
              if (catId) payload.categoryId = catId
            }
            if (col === 2) {
              payload.vendor = value == null ? undefined : strVal
            }
            if (col === 3) {
              payload.description = value == null ? undefined : strVal
            }
            if (col === 4 && value != null) {
              payload.amount = Number(value)
            }
          }

          if (Object.keys(payload).length > 0) {
            try {
              await updateTransaction(existingId, payload)
            } catch (err) {
              console.error('Failed to update transaction:', err)
            }
          }
        } else {
          const date = rowData[0]
          const categoryName = rowData[1]
          const amount = rowData[4]

          if (!date || !categoryName || amount == null) continue

          const catId = getCategoryId(String(categoryName))
          if (!catId) continue

          try {
            const result = await createExpense({
              categoryId: catId,
              amount: Number(amount),
              date: new Date(String(date)),
              description: rowData[3] != null ? String(rowData[3]) : undefined,
              vendor: rowData[2] != null ? String(rowData[2]) : undefined,
            })

            if ('success' in result && result.transaction) {
              rowIdsRef.current[row] = result.transaction.id
            }
          } catch (err) {
            console.error('Failed to create expense:', err)
          }
        }
      }
    })()
  }, [getCategoryId])

  const handleAfterChange = useCallback(
    (changes: CellChange[] | null, source: ChangeSource) => {
      if (source === 'loadData' || !changes) return

      recomputeTotal()

      for (const change of changes) {
        const [row, col, , newVal] = change as [number, string | number, unknown, unknown]
        const colNum = typeof col === 'number' ? col : 0
        pendingChangesRef.current.set(`${row}:${colNum}`, { row, col: colNum, value: newVal })
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(flushPendingChanges, 500)
    },
    [recomputeTotal, flushPendingChanges]
  )

  const handleDelete = useCallback(
    (row: number) => {
      const id = rowIdsRef.current[row]

      if (id) {
        void (async () => {
          try {
            await deleteTransaction(id)
            dataRef.current.splice(row, 1)
            rowIdsRef.current.splice(row, 1)
            setDataVersion((v) => v + 1)
            recomputeTotal()
          } catch (err) {
            console.error('Failed to delete transaction:', err)
          }
        })()
      } else {
        dataRef.current.splice(row, 1)
        if (row < rowIdsRef.current.length) {
          rowIdsRef.current.splice(row, 1)
        }
        setDataVersion((v) => v + 1)
        recomputeTotal()
      }
    },
    [recomputeTotal]
  )

  const yearOptions: number[] = []
  for (let y = 2020; y <= currentYear; y++) {
    yearOptions.push(y)
  }

  const columns = [
    { type: 'date' as const, dateFormat: 'YYYY-MM-DD' },
    { type: 'dropdown' as const, source: categoryNames },
    { type: 'text' as const },
    { type: 'text' as const },
    { type: 'numeric' as const, numericFormat: { pattern: '$0,0.00' } },
    { type: 'text' as const },
  ]

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-lg h-64" />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="year-filter" className="text-sm font-medium text-foreground">
          Year:
        </label>
        <select
          id="year-filter"
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value))
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <HotTable
          key={dataVersion}
          // eslint-disable-next-line react-hooks/refs -- Handsontable mutates this array in place; a ref (remounted via key) is its documented React binding
          data={dataRef.current}
          colHeaders={['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Notes']}
          columns={columns}
          minSpareRows={1}
          licenseKey="non-commercial-and-evaluation"
          height={500}
          stretchH="all"
          autoWrapRow
          rowHeaders
          afterChange={handleAfterChange}
          contextMenu={{
            items: {
              remove_row: {
                name: 'Delete row',
                callback: (_key: string, selection: { start: { row: number } }[]) => {
                  const sel = selection[0]
                  if (sel) {
                    handleDelete(sel.start.row)
                  }
                },
              },
            },
          }}
        />
      </div>

      <div className="flex justify-end px-4">
        <div className="text-sm font-semibold text-foreground">
          Total: $
          {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}
