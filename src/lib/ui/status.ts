// Status → Badge variant mappings for consistent UI across the application

import type {
  BookingStatus,
  JobStatus,
  JobPriority,
  TransactionType,
} from '@prisma/client'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

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

// Maintenance job status mappings
export const jobStatusVariant: Record<JobStatus, BadgeVariant> = {
  OPEN: 'warning',
  QUOTED: 'secondary',
  ASSIGNED: 'secondary',
  SCHEDULED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  APPROVED: 'success',
  PAID: 'success',
  CANCELLED: 'destructive',
}

export const jobStatusLabel: Record<JobStatus, string> = {
  OPEN: 'Open',
  QUOTED: 'Quoted',
  ASSIGNED: 'Assigned',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
}

// Job priority mappings
export const jobPriorityVariant: Record<JobPriority, BadgeVariant> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}

export const jobPriorityLabel: Record<JobPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

// Transaction type mappings
export const transactionTypeVariant: Record<TransactionType, BadgeVariant> = {
  INCOME: 'success',
  EXPENSE: 'destructive',
}

export const transactionTypeLabel: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
}
