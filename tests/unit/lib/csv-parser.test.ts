import { describe, it, expect } from 'vitest'
import { validateCsvRows } from '@/lib/csv-parser'
import type { BankCsvRow } from '@/lib/csv-parser'

describe('CSV Parser', () => {
  // =============================================================================
  // validateCsvRows TESTS
  // =============================================================================
  describe('validateCsvRows', () => {
    const makeValidRow = (overrides: Record<string, unknown> = {}) => ({
      transactionDate: '2024-06-15',
      postDate: '2024-06-16',
      description: 'AMAZON PURCHASE',
      category: 'Shopping',
      type: 'Sale',
      amount: '-42.99',
      ...overrides,
    })

    it('should return valid rows for well-formed input', () => {
      const rows = [
        makeValidRow(),
        makeValidRow({
          transactionDate: '2024-07-01',
          description: 'HOME DEPOT',
          amount: '125.50',
        }),
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it('should coerce string dates to Date objects', () => {
      const rows = [makeValidRow({ transactionDate: '2024-06-15', postDate: '2024-06-16' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0] as BankCsvRow
      expect(row.transactionDate).toBeInstanceOf(Date)
      expect(row.postDate).toBeInstanceOf(Date)
    })

    it('should coerce string amounts to numbers', () => {
      const rows = [makeValidRow({ amount: '42.99' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0] as BankCsvRow
      expect(typeof row.amount).toBe('number')
      expect(row.amount).toBe(42.99)
    })

    it('should preserve negative amounts correctly', () => {
      const rows = [makeValidRow({ amount: '-150.00' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0] as BankCsvRow
      expect(row.amount).toBe(-150)
    })

    it('should handle various date formats via z.coerce.date()', () => {
      const rows = [
        makeValidRow({ transactionDate: '2024-06-15' }), // ISO
        makeValidRow({ transactionDate: '06/15/2024' }), // US format
        makeValidRow({ transactionDate: 'June 15, 2024' }), // Long format
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(3)
      for (const row of result.valid) {
        expect(row.transactionDate).toBeInstanceOf(Date)
      }
    })

    it('should return errors for missing required description', () => {
      const rows = [makeValidRow({ description: '' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.row).toBe(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('description'))).toBe(true)
    })

    it('should return errors for missing required category', () => {
      const rows = [makeValidRow({ category: '' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('category'))).toBe(true)
    })

    it('should return errors for missing required type', () => {
      const rows = [makeValidRow({ type: '' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('type'))).toBe(true)
    })

    it('should return errors for invalid date', () => {
      const rows = [makeValidRow({ transactionDate: 'not-a-date' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('transactionDate'))).toBe(true)
    })

    it('should return errors for invalid amount (non-numeric)', () => {
      const rows = [makeValidRow({ amount: 'not-a-number' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('amount'))).toBe(true)
    })

    it('should handle multiple invalid rows with correct row numbers', () => {
      const rows = [
        makeValidRow(), // row 1: valid
        makeValidRow({ description: '' }), // row 2: invalid
        makeValidRow(), // row 3: valid
        makeValidRow({ amount: 'abc' }), // row 4: invalid
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(2)
      expect(result.invalid[0]?.row).toBe(2)
      expect(result.invalid[1]?.row).toBe(4)
    })

    it('should handle empty input array', () => {
      const result = validateCsvRows([])

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(0)
    })

    it('should make memo optional', () => {
      const rowWithMemo = makeValidRow({ memo: 'Some memo text' })
      const rowWithoutMemo = makeValidRow()
      delete (rowWithoutMemo as Record<string, unknown>).memo

      const result = validateCsvRows([rowWithMemo, rowWithoutMemo])

      expect(result.valid).toHaveLength(2)
      const first = result.valid[0] as BankCsvRow
      const second = result.valid[1] as BankCsvRow
      expect(first.memo).toBe('Some memo text')
      expect(second.memo).toBeUndefined()
    })

    it('should handle multiple errors on a single row', () => {
      const rows = [{ description: '', category: '', type: '', amount: 'abc' }]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      // Should have errors for transactionDate, postDate, description, category, type, amount
      expect(result.invalid[0]?.errors.length).toBeGreaterThanOrEqual(4)
    })
  })
})
