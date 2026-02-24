import { z } from 'zod'
import Papa from 'papaparse'

/**
 * Bank CSV row after parsing and validation
 */
export interface BankCsvRow {
  transactionDate: Date
  postDate: Date
  description: string
  category: string
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
 * Zod schema for validating bank statement rows
 * Handles date coercion and number coercion for amounts
 */
const bankCsvRowSchema = z.object({
  transactionDate: z.coerce.date(),
  postDate: z.coerce.date(),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  type: z.string().min(1, 'Type is required'),
  amount: z.coerce.number(),
  memo: z.string().optional(),
})

/**
 * Normalize CSV header names: trim whitespace, convert to camelCase
 * @param header - Raw header from CSV
 * @returns Normalized header name in camelCase
 */
function normalizeHeader(header: string): string {
  const trimmed = header.trim().replace(/^\uFEFF/, '')
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
