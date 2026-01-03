import type { Booking, BlockedDate } from '@prisma/client'

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Check if a date range is available (not overlapping with bookings or blocked dates)
 */
export const isDateRangeAvailable = (
  checkIn: Date,
  checkOut: Date,
  bookings: Pick<Booking, 'checkIn' | 'checkOut'>[],
  blockedDates: Pick<BlockedDate, 'startDate' | 'endDate'>[]
): boolean => {
  // Check against existing bookings
  for (const booking of bookings) {
    if (
      (checkIn >= booking.checkIn && checkIn < booking.checkOut) ||
      (checkOut > booking.checkIn && checkOut <= booking.checkOut) ||
      (checkIn <= booking.checkIn && checkOut >= booking.checkOut)
    ) {
      return false
    }
  }

  // Check against blocked dates
  for (const blocked of blockedDates) {
    if (
      (checkIn >= blocked.startDate && checkIn < blocked.endDate) ||
      (checkOut > blocked.startDate && checkOut <= blocked.endDate) ||
      (checkIn <= blocked.startDate && checkOut >= blocked.endDate)
    ) {
      return false
    }
  }

  return true
}

/**
 * Get all unavailable date ranges from bookings and blocked dates
 */
export const getUnavailableDates = (
  bookings: Pick<Booking, 'checkIn' | 'checkOut'>[],
  blockedDates: Pick<BlockedDate, 'startDate' | 'endDate'>[]
): DateRange[] => {
  const ranges: DateRange[] = []

  for (const booking of bookings) {
    ranges.push({
      start: booking.checkIn,
      end: booking.checkOut,
    })
  }

  for (const blocked of blockedDates) {
    ranges.push({
      start: blocked.startDate,
      end: blocked.endDate,
    })
  }

  return ranges.sort((a, b) => a.start.getTime() - b.start.getTime())
}

/**
 * Format a date as iCal DATE format (YYYYMMDD)
 */
export const formatICalDate = (date: Date): string => {
  const isoString = date.toISOString().replace(/[-:]/g, '')
  return isoString.split('T')[0] ?? ''
}
