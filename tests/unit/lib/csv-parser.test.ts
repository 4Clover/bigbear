import { describe, it, expect } from 'vitest'
import { validateCsvRows, parseFlexibleDate, normalizeHeader } from '@/lib/csv-parser'

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
      const row = result.valid[0]!
      expect(row.transactionDate).toBeInstanceOf(Date)
      expect(row.postDate).toBeInstanceOf(Date)
    })

    it('should coerce string amounts to numbers', () => {
      const rows = [makeValidRow({ amount: '42.99' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0]!
      expect(typeof row.amount).toBe('number')
      expect(row.amount).toBe(42.99)
    })

    it('should preserve negative amounts correctly', () => {
      const rows = [makeValidRow({ amount: '-150.00' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0]!
      expect(row.amount).toBe(-150)
    })

    it('should handle various date formats', () => {
      const rows = [
        makeValidRow({ transactionDate: '2024-06-15' }), // ISO
        makeValidRow({ transactionDate: '06/15/2024' }), // US slash
        makeValidRow({ transactionDate: 'June 15, 2024' }), // Long format
        makeValidRow({ transactionDate: '06-15-2024' }), // Dash format
        makeValidRow({ transactionDate: '6/15/2024' }), // Single-digit month
        makeValidRow({ transactionDate: '06/15/24' }), // Short year
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(6)
      for (const row of result.valid) {
        expect(row.transactionDate).toBeInstanceOf(Date)
      }
    })

    it('should parse European dot-separated dates (DD.MM.YYYY)', () => {
      const rows = [
        makeValidRow({ transactionDate: '15.06.2024', postDate: '16.06.2024' }),
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0]!
      expect(row.transactionDate.getFullYear()).toBe(2024)
      expect(row.transactionDate.getMonth()).toBe(5) // June = 5
      expect(row.transactionDate.getDate()).toBe(15)
    })

    it('should accept Date objects directly', () => {
      const rows = [
        makeValidRow({
          transactionDate: new Date('2024-06-15'),
          postDate: new Date('2024-06-16'),
        }),
      ]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      const row = result.valid[0]!
      expect(row.transactionDate).toBeInstanceOf(Date)
    })

    it('should return errors for missing required description', () => {
      const rows = [makeValidRow({ description: '' })]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]?.row).toBe(1)
      expect(result.invalid[0]?.errors.some((e) => e.includes('description'))).toBe(true)
    })

    it('should accept empty category (optional field)', () => {
      const rows = [makeValidRow({ category: '' })]
      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(0)
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
      const first = result.valid[0]!
      const second = result.valid[1]!
      expect(first.memo).toBe('Some memo text')
      expect(second.memo).toBeUndefined()
    })

    it('should handle multiple errors on a single row', () => {
      const rows = [{ description: '', category: '', type: '', amount: 'abc' }]

      const result = validateCsvRows(rows)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      // Should have errors for transactionDate, postDate, description, type, amount
      expect(result.invalid[0]?.errors.length).toBeGreaterThanOrEqual(4)
    })
  })

  // =============================================================================
  // parseFlexibleDate TESTS
  // =============================================================================
  describe('parseFlexibleDate', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      const date = parseFlexibleDate('2024-06-15')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should parse US slash format (MM/DD/YYYY)', () => {
      const date = parseFlexibleDate('06/15/2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should parse short year (MM/DD/YY)', () => {
      const date = parseFlexibleDate('06/15/24')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should parse dash format (MM-DD-YYYY)', () => {
      const date = parseFlexibleDate('06-15-2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should parse European dot format (DD.MM.YYYY)', () => {
      const date = parseFlexibleDate('15.06.2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should parse text month format', () => {
      const date = parseFlexibleDate('June 15, 2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBe(15)
    })

    it('should return Invalid Date for garbage input', () => {
      const date = parseFlexibleDate('not-a-date')
      expect(Number.isNaN(date.getTime())).toBe(true)
    })

    it('should return Invalid Date for empty string', () => {
      const date = parseFlexibleDate('')
      expect(Number.isNaN(date.getTime())).toBe(true)
    })

    it('should handle single-digit month and day', () => {
      const date = parseFlexibleDate('1/5/2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(5)
    })
  })

  // =============================================================================
  // normalizeHeader TESTS
  // =============================================================================
  describe('normalizeHeader', () => {
    it('should convert multi-word headers to camelCase', () => {
      expect(normalizeHeader('Transaction Date')).toBe('transactionDate')
      expect(normalizeHeader('Post Date')).toBe('postDate')
    })

    it('should lowercase single-word headers', () => {
      expect(normalizeHeader('Description')).toBe('description')
      expect(normalizeHeader('Category')).toBe('category')
      expect(normalizeHeader('Amount')).toBe('amount')
    })

    it('should be idempotent (PapaParse calls transformHeader twice)', () => {
      // First call: raw header → camelCase
      const first = normalizeHeader('Transaction Date')
      expect(first).toBe('transactionDate')

      // Second call: already camelCase → must stay the same
      const second = normalizeHeader(first)
      expect(second).toBe('transactionDate')
    })

    it('should be idempotent for single-word headers', () => {
      const first = normalizeHeader('Description')
      const second = normalizeHeader(first)
      expect(second).toBe('description')
    })

    it('should strip BOM character', () => {
      expect(normalizeHeader('\uFEFFTransaction Date')).toBe('transactionDate')
    })

    it('should trim whitespace', () => {
      expect(normalizeHeader('  Post Date  ')).toBe('postDate')
    })
  })

  // =============================================================================
  // REAL-WORLD BANK CSV DATA
  // =============================================================================
  describe('real-world Chase CSV data', () => {
    // Simulates PapaParse output after transformHeader: normalizeHeader
    const chaseRows = [
      { transactionDate: '2/18/2026', postDate: '2/19/2026', description: '76 - CF UNITED APRO LL', category: 'Gas', type: 'Sale', amount: '-15.26', memo: '' },
      { transactionDate: '2/15/2026', postDate: '2/17/2026', description: 'STATERBROS091', category: 'Groceries', type: 'Sale', amount: '-61.1', memo: '' },
      { transactionDate: '2/17/2026', postDate: '2/17/2026', description: 'STARBUCKS 8007827282', category: 'Food & Drink', type: 'Sale', amount: '-10', memo: '' },
      { transactionDate: '2/16/2026', postDate: '2/17/2026', description: 'TARGET        00018341', category: 'Shopping', type: 'Sale', amount: '-15.06', memo: '' },
      { transactionDate: '2/15/2026', postDate: '2/17/2026', description: 'STATERBROS091', category: 'Groceries', type: 'Sale', amount: '-95.84', memo: '' },
      { transactionDate: '2/14/2026', postDate: '2/16/2026', description: 'TRACTOR SUPPLY #2796', category: 'Automotive', type: 'Sale', amount: '-234.83', memo: '' },
      { transactionDate: '2/15/2026', postDate: '2/16/2026', description: 'VONS.COM #2147', category: 'Groceries', type: 'Return', amount: '4.95', memo: '' },
      { transactionDate: '2/14/2026', postDate: '2/16/2026', description: 'ARCO 900887', category: 'Gas', type: 'Sale', amount: '-80.18', memo: '' },
      { transactionDate: '2/15/2026', postDate: '2/15/2026', description: 'Payment Thank You-Mobile', category: '', type: 'Payment', amount: '4060.03', memo: '' },
      { transactionDate: '2/12/2026', postDate: '2/15/2026', description: 'THE HOME DEPOT 1083', category: 'Home', type: 'Sale', amount: '-148.36', memo: '' },
      { transactionDate: '2/13/2026', postDate: '2/15/2026', description: 'VONS.COM #2147', category: 'Groceries', type: 'Sale', amount: '-285.17', memo: '' },
      { transactionDate: '2/13/2026', postDate: '2/15/2026', description: 'SHEIN.COM', category: 'Shopping', type: 'Return', amount: '5.53', memo: '' },
      { transactionDate: '2/13/2026', postDate: '2/15/2026', description: '7-ELEVEN 32151', category: 'Gas', type: 'Sale', amount: '-17.02', memo: '' },
      { transactionDate: '2/13/2026', postDate: '2/15/2026', description: 'AUTOZONE #0048', category: 'Automotive', type: 'Sale', amount: '-8.61', memo: ' ' },
    ]

    it('should parse all 14 rows including payment row with empty category', () => {
      const result = validateCsvRows(chaseRows)
      expect(result.valid).toHaveLength(14)
      expect(result.invalid).toHaveLength(0)

      const paymentRow = result.valid.find((r) => r.description === 'Payment Thank You-Mobile')
      expect(paymentRow).toBeDefined()
      expect(paymentRow?.category).toBe('')
      expect(paymentRow?.type).toBe('Payment')
      expect(paymentRow?.amount).toBe(4060.03)
    })

    it('should parse M/D/YYYY date format correctly', () => {
      const result = validateCsvRows(chaseRows)

      const firstRow = result.valid[0]
      expect(firstRow?.transactionDate).toBeInstanceOf(Date)
      expect(firstRow?.transactionDate.getFullYear()).toBe(2026)
      expect(firstRow?.transactionDate.getMonth()).toBe(1) // February
      expect(firstRow?.transactionDate.getDate()).toBe(18)
    })

    it('should coerce negative and positive amounts correctly', () => {
      const result = validateCsvRows(chaseRows)

      // Sale (negative)
      const gasRow = result.valid[0]
      expect(gasRow?.amount).toBe(-15.26)

      // Return (positive)
      const returnRow = result.valid.find((r) => r.description === 'VONS.COM #2147' && r.amount > 0)
      expect(returnRow?.amount).toBe(4.95)
    })

    it('should preserve descriptions with special characters and extra spaces', () => {
      const result = validateCsvRows(chaseRows)

      const target = result.valid.find((r) => r.description.includes('TARGET'))
      expect(target?.description).toBe('TARGET        00018341')

      const gas = result.valid.find((r) => r.description.includes('CF UNITED'))
      expect(gas?.description).toBe('76 - CF UNITED APRO LL')
    })

    it('should handle whole-number amounts without decimals', () => {
      const result = validateCsvRows(chaseRows)

      const starbucks = result.valid.find((r) => r.description.includes('STARBUCKS'))
      expect(starbucks?.amount).toBe(-10)
    })
  })
})