import { z } from 'zod'
import Papa from 'papaparse'

/**
 * Bank CSV row after parsing and validation
 */
export interface BankCsvRow {
  transactionDate: Date
  postDate: Date
  description: string
  category?: string
  type: string
  amount: number
  memo?: string
}

/**
 * Parse error for a single row
 */
export interface ParseError {
  row: number
  errors: string[]
}

/**
 * Result of parsing a bank CSV file
 */
export interface ParsedCsvResult {
  rows: BankCsvRow[]
  errors: ParseError[]
  totalRows: number
}

/**
 * Parse a date string into a Date object, supporting multiple common bank CSV formats.
 * Tries ISO, US slash (MM/DD), dash, European dot (DD.MM), then native Date fallback.
 *
 * @param value - Raw date string from CSV
 * @returns Date object (may be Invalid Date if format is unrecognized)
 */
export function parseFlexibleDate(value: string): Date {
  const trimmed = value.trim()
  if (!trimmed) return new Date(NaN)

  // ISO format: 2024-01-15 or 2024-01-15T...
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed)
  if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  }

  // Slash format: M/D/YYYY or M/D/YY (US convention: month first)
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed)
  if (slashMatch?.[1] && slashMatch[2] && slashMatch[3]) {
    let year = Number(slashMatch[3])
    if (year < 100) year += 2000
    return new Date(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]))
  }

  // Dash format (non-ISO order): M-D-YYYY or M-D-YY
  const dashMatch = /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/.exec(trimmed)
  if (dashMatch?.[1] && dashMatch[2] && dashMatch[3]) {
    let year = Number(dashMatch[3])
    if (year < 100) year += 2000
    return new Date(year, Number(dashMatch[1]) - 1, Number(dashMatch[2]))
  }

  // Dot format: D.M.YYYY (European convention: day first)
  const dotMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(trimmed)
  if (dotMatch?.[1] && dotMatch[2] && dotMatch[3]) {
    let year = Number(dotMatch[3])
    if (year < 100) year += 2000
    return new Date(year, Number(dotMatch[2]) - 1, Number(dotMatch[1]))
  }

  // Fallback: native Date parsing for text formats (e.g., "June 15, 2024")
  return new Date(trimmed)
}

/**
 * Zod schema that accepts Date objects or date strings and parses them flexibly.
 * Replaces z.coerce.date() which fails in Zod 4 when new Date(string) produces
 * an Invalid Date for non-standard formats.
 */
const flexibleDateSchema = z
  .unknown()
  .transform((val, ctx): Date => {
    if (val instanceof Date) {
      if (!Number.isNaN(val.getTime())) return val
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid date',
      })
      return val
    }
    if (typeof val === 'string') {
      const parsed = parseFlexibleDate(val)
      if (!Number.isNaN(parsed.getTime())) return parsed
      ctx.addIssue({
        code: 'custom',
        message: `Invalid date format: ${val}`,
      })
      return new Date(NaN)
    }
    ctx.addIssue({
      code: 'custom',
      message: 'Expected a date string or Date object',
    })
    return new Date(NaN)
  })

/**
 * Zod schema for validating bank statement rows
 * Uses flexible date parsing and number coercion for amounts
 */
const bankCsvRowSchema = z.object({
  transactionDate: flexibleDateSchema,
  postDate: flexibleDateSchema,
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  amount: z.coerce.number(),
  memo: z.string().optional(),
})

/**
 * Normalize CSV header names: trim whitespace, convert to camelCase.
 * Must be idempotent — PapaParse may call transformHeader more than once.
 *
 * @param header - Raw header from CSV
 * @returns Normalized header name in camelCase
 */
export function normalizeHeader(header: string): string {
  const trimmed = header.trim().replace(/^\uFEFF/, '')
  // Already normalized (no spaces, starts lowercase) — return as-is for idempotency
  if (!trimmed.includes(' ') && !/^[A-Z]/.test(trimmed)) {
    return trimmed
  }
  const words = trimmed.split(/\s+/)
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

/**
 * Parse a bank statement CSV file using PapaParse
 * Handles BOM characters, quoted fields, and various date formats
 *
 * @param file - File object from input[type="file"]
 * @returns Promise resolving to ParsedCsvResult with rows and errors
 */
export async function parseBankCsv(file: File): Promise<ParsedCsvResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => {
        const rows: BankCsvRow[] = []
        const errors: ParseError[] = []

        // Process each row
        for (let i = 0; i < results.data.length; i++) {
          const rowData = results.data[i]
          const rowNumber = i + 2 // +2 because row 1 is header, 0-indexed

          // Validate row against schema
          const validation = bankCsvRowSchema.safeParse(rowData)

          if (!validation.success) {
            const errorMessages = validation.error.issues.map((issue) => {
              const path = issue.path.join('.')
              return `${path}: ${issue.message}`
            })
            errors.push({
              row: rowNumber,
              errors: errorMessages,
            })
          } else {
            rows.push(validation.data)
          }
        }

        resolve({
          rows,
          errors,
          totalRows: results.data.length,
        })
      },
      error: (error) => {
        // Handle parse errors
        resolve({
          rows: [],
          errors: [
            {
              row: 0,
              errors: [`CSV parsing failed: ${error.message}`],
            },
          ],
          totalRows: 0,
        })
      },
    })
  })
}

/**
 * Validate an array of rows against the bank CSV schema
 * Useful for validating data from other sources (e.g., API responses)
 *
 * @param rows - Array of unknown objects to validate
 * @returns Object with valid rows and invalid rows with error details
 */
export function validateCsvRows(rows: unknown[]): {
  valid: BankCsvRow[]
  invalid: { row: number; errors: string[] }[]
} {
  const valid: BankCsvRow[] = []
  const invalid: { row: number; errors: string[] }[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowData = rows[i]
    const rowNumber = i + 1

    const validation = bankCsvRowSchema.safeParse(rowData)

    if (!validation.success) {
      const errorMessages = validation.error.issues.map((issue) => {
        const path = issue.path.join('.')
        return `${path}: ${issue.message}`
      })
      invalid.push({
        row: rowNumber,
        errors: errorMessages,
      })
    } else {
      valid.push(validation.data)
    }
  }

  return { valid, invalid }
}
