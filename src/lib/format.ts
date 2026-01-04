/**
 * Shared formatting utilities for consistent display across the application.
 */

/**
 * Formats a number as US currency (USD).
 */
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

/**
 * Formats a date for display.
 */
export const formatDate = (date: Date | string): string =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))

/**
 * Formats a percentage value.
 */
export const formatPercentage = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`
