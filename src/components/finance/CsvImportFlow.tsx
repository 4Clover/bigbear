'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { parseBankCsv } from '@/lib/csv-parser'
import type { BankCsvRow, ParseError } from '@/lib/csv-parser'
import type { ExpenseCategory } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/format'

interface CsvImportFlowProps {
  categories: ExpenseCategory[]
}

export const CsvImportFlow = ({ categories }: CsvImportFlowProps) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [parsedRows, setParsedRows] = useState<BankCsvRow[]>([])
  const [parseErrors, setParseErrors] = useState<ParseError[]>([])

  const [bankCategory, setBankCategory] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [search, setSearch] = useState('')
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
  const [categoryMappings, setCategoryMappings] = useState<Record<number, string>>({})

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await parseBankCsv(file)
    setParsedRows(result.rows)
    setParseErrors(result.errors)
    const newMappings: Record<number, string> = {}
    result.rows.forEach((row, index) => {
      const bCat = row.category.toLowerCase()
      const match = categories.find(
        (c) => bCat.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(bCat)
      )
      if (match) {
        newMappings[index] = match.id
      }
    })
    setCategoryMappings(newMappings)

    setBankCategory('')
    setMinAmount('')
    setMaxAmount('')
    setFromDate('')
    setToDate('')
    setSelectedRowIndices(new Set())
  }

  const uniqueBankCategories = useMemo(() => {
    return Array.from(new Set(parsedRows.map((r) => r.category))).sort()
  }, [parsedRows])

  const filteredRows = useMemo(() => {
    return parsedRows.filter((row) => {
      if (search) {
        const term = search.toLowerCase()
        const descMatch = row.description.toLowerCase().includes(term)
        const memoMatch = row.memo ? row.memo.toLowerCase().includes(term) : false
        if (!descMatch && !memoMatch) return false
      }
      if (bankCategory && row.category !== bankCategory) {
        return false
      }

      const absAmount = Math.abs(row.amount)
      if (minAmount && absAmount < parseFloat(minAmount)) return false
      if (maxAmount && absAmount > parseFloat(maxAmount)) return false

      if (fromDate && new Date(row.transactionDate) < new Date(fromDate)) return false
      if (toDate && new Date(row.transactionDate) > new Date(toDate)) return false

      return true
    })
  }, [parsedRows, search, bankCategory, minAmount, maxAmount, fromDate, toDate])

  const handleSelectAll = () => {
    const newSelected = new Set(selectedRowIndices)
    filteredRows.forEach((row) => {
      const index = parsedRows.indexOf(row)
      newSelected.add(index)
    })
    setSelectedRowIndices(newSelected)
  }

  const handleDeselectAll = () => {
    const newSelected = new Set(selectedRowIndices)
    filteredRows.forEach((row) => {
      const index = parsedRows.indexOf(row)
      newSelected.delete(index)
    })
    setSelectedRowIndices(newSelected)
  }

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRowIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRowIndices(newSelected)
  }

  const handleCategoryMappingChange = (index: number, categoryId: string) => {
    setCategoryMappings((prev) => ({ ...prev, [index]: categoryId }))
  }

  const isDuplicate = (index: number, row: BankCsvRow) => {
    return parsedRows.some((r, i) => {
      if (i === index) return false
      if (!selectedRowIndices.has(i)) return false
      return (
        r.transactionDate.getTime() === row.transactionDate.getTime() && r.amount === row.amount
      )
    })
  }

  const handleImport = () => {
    const dataToImport = Array.from(selectedRowIndices).map((index) => ({
      row: parsedRows[index],
      categoryId: categoryMappings[index],
    }))
    console.log('Would import:', dataToImport)
    alert('Import will be wired in next step')
  }

  const selectedCount = selectedRowIndices.size
  const isImportDisabled =
    selectedCount === 0 || Array.from(selectedRowIndices).some((idx) => !categoryMappings[idx])

  return (
    <div className="space-y-6">
      {step === 1 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-foreground">1. Upload & Filter CSV</h2>
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  void handleFileUpload(e)
                }}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm border border-destructive/20">
                <p className="font-semibold mb-2">Found {parseErrors.length} parsing errors:</p>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                  {parseErrors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.errors.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Search</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                    }}
                    placeholder="Description or memo..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bank Category
                  </label>
                  <select
                    value={bankCategory}
                    onChange={(e) => {
                      setBankCategory(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">All bank categories</option>
                    {uniqueBankCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Min $</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => {
                      setMinAmount(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max $</label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => {
                      setMaxAmount(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Showing {filteredRows.length} of {parsedRows.length} rows
                </span>
                <Button
                  onClick={() => {
                    setStep(2)
                  }}
                >
                  Next: Select Rows &rarr;
                </Button>
              </div>

              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="bg-card hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {formatDate(row.transactionDate)}
                        </td>
                        <td className="px-4 py-3 text-foreground">{row.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                        <td className="px-4 py-3 text-foreground text-right whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t border-border bg-muted/20">
                    Showing first 100 rows. Use filters to narrow down.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">2. Select & Map Categories</h2>
            <Button
              variant="outline"
              onClick={() => {
                setStep(1)
              }}
            >
              &larr; Back
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleSelectAll}>
                Select All Filtered
              </Button>
              <Button variant="outline" onClick={handleDeselectAll}>
                Deselect All
              </Button>
              <span className="text-sm font-medium text-foreground ml-2">
                {selectedCount} selected
              </span>
            </div>
            <Button onClick={handleImport} disabled={isImportDisabled}>
              Import Selected ({selectedCount})
            </Button>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Bank Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium w-64">Map to Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.map((row) => {
                  const globalIndex = parsedRows.indexOf(row)
                  const isSelected = selectedRowIndices.has(globalIndex)
                  const showDuplicateWarning = isSelected && isDuplicate(globalIndex, row)

                  return (
                    <tr
                      key={globalIndex}
                      className={`transition-colors ${isSelected ? 'bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            toggleRowSelection(globalIndex)
                          }}
                          className="rounded border-border text-primary focus:ring-primary bg-background w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {formatDate(row.transactionDate)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{row.description}</span>
                          {showDuplicateWarning && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
                              ⚠ Possible duplicate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                      <td className="px-4 py-3 text-foreground text-right whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={categoryMappings[globalIndex] || ''}
                          onChange={(e) => {
                            handleCategoryMappingChange(globalIndex, e.target.value)
                          }}
                          className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                            isSelected && !categoryMappings[globalIndex]
                              ? 'border-destructive ring-1 ring-destructive/50'
                              : 'border-border'
                          }`}
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No rows match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
