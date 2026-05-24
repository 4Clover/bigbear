// Status → Badge variant mappings for consistent UI across the application

import type { BookingStatus } from '@prisma/client'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'
  | 'outline'

// Booking status mappings
export const bookingStatusVariant: Record<BookingStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  COMPLETED: 'default',
  NO_SHOW: 'destructive',
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
}
