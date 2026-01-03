import { describe, it, expect } from 'vitest'
import { eachDayOfInterval, startOfDay } from 'date-fns'

/**
 * Availability and date overlap tests.
 * Tests the core availability logic including:
 * - Date overlap detection between bookings
 * - Blocked date merging from multiple sources
 * - Date range validation
 * - Availability query optimization
 */

interface DateRange {
  start: Date
  end: Date
}

interface Booking {
  id: string
  checkIn: Date
  checkOut: Date
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
}

interface BlockedDate {
  startDate: Date
  endDate: Date
  source: string
}

// Core availability functions
const doDateRangesOverlap = (range1: DateRange, range2: DateRange): boolean => {
  return range1.start < range2.end && range2.start < range1.end
}

const isDateBlocked = (date: Date, blockedDates: Date[]): boolean => {
  const dateStr = startOfDay(date).toISOString()
  return blockedDates.some((blocked) => startOfDay(blocked).toISOString() === dateStr)
}

const getBlockedDatesInRange = (
  rangeStart: Date,
  rangeEnd: Date,
  bookings: Booking[],
  blockedDates: BlockedDate[]
): Date[] => {
  const allBlockedDates: Date[] = []

  // Add dates from active bookings
  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue

    const days = eachDayOfInterval({
      start: booking.checkIn,
      end: booking.checkOut,
    })
    allBlockedDates.push(...days)
  }

  // Add manually blocked dates
  for (const blocked of blockedDates) {
    const days = eachDayOfInterval({
      start: blocked.startDate,
      end: blocked.endDate,
    })
    allBlockedDates.push(...days)
  }

  // Filter to range and deduplicate
  const rangeStartNorm = startOfDay(rangeStart)
  const rangeEndNorm = startOfDay(rangeEnd)

  return [...new Set(allBlockedDates.map((d) => startOfDay(d).toISOString()))]
    .filter((dateStr) => {
      const date = new Date(dateStr)
      return date >= rangeStartNorm && date <= rangeEndNorm
    })
    .map((dateStr) => new Date(dateStr))
}

const canBookDateRange = (
  checkIn: Date,
  checkOut: Date,
  existingBookings: Booking[],
  blockedDates: BlockedDate[]
): { available: boolean; conflicts: string[] } => {
  const conflicts: string[] = []

  // Check against existing bookings
  for (const booking of existingBookings) {
    if (booking.status === 'CANCELLED') continue

    if (doDateRangesOverlap(
      { start: checkIn, end: checkOut },
      { start: booking.checkIn, end: booking.checkOut }
    )) {
      conflicts.push(`Conflicts with booking ${booking.id}`)
    }
  }

  // Check against blocked dates
  for (const blocked of blockedDates) {
    if (doDateRangesOverlap(
      { start: checkIn, end: checkOut },
      { start: blocked.startDate, end: blocked.endDate }
    )) {
      conflicts.push(`Overlaps blocked period from ${blocked.source}`)
    }
  }

  return {
    available: conflicts.length === 0,
    conflicts,
  }
}

describe('Availability Calculation', () => {
  describe('Date range overlap detection', () => {
    it('should detect overlapping ranges', () => {
      const range1 = { start: new Date('2024-06-01'), end: new Date('2024-06-05') }
      const range2 = { start: new Date('2024-06-03'), end: new Date('2024-06-08') }

      expect(doDateRangesOverlap(range1, range2)).toBe(true)
    })

    it('should detect when range1 contains range2', () => {
      const range1 = { start: new Date('2024-06-01'), end: new Date('2024-06-10') }
      const range2 = { start: new Date('2024-06-03'), end: new Date('2024-06-07') }

      expect(doDateRangesOverlap(range1, range2)).toBe(true)
    })

    it('should detect when range2 contains range1', () => {
      const range1 = { start: new Date('2024-06-03'), end: new Date('2024-06-07') }
      const range2 = { start: new Date('2024-06-01'), end: new Date('2024-06-10') }

      expect(doDateRangesOverlap(range1, range2)).toBe(true)
    })

    it('should not overlap for adjacent ranges (end = start)', () => {
      // Back-to-back bookings should be allowed
      const range1 = { start: new Date('2024-06-01'), end: new Date('2024-06-05') }
      const range2 = { start: new Date('2024-06-05'), end: new Date('2024-06-08') }

      expect(doDateRangesOverlap(range1, range2)).toBe(false)
    })

    it('should not overlap for non-adjacent ranges', () => {
      const range1 = { start: new Date('2024-06-01'), end: new Date('2024-06-05') }
      const range2 = { start: new Date('2024-06-10'), end: new Date('2024-06-15') }

      expect(doDateRangesOverlap(range1, range2)).toBe(false)
    })

    it('should handle same-day ranges', () => {
      const range1 = { start: new Date('2024-06-01'), end: new Date('2024-06-02') }
      const range2 = { start: new Date('2024-06-01'), end: new Date('2024-06-02') }

      expect(doDateRangesOverlap(range1, range2)).toBe(true)
    })
  })

  describe('Blocked date checking', () => {
    const blockedDates = [
      new Date('2024-06-15'),
      new Date('2024-06-16'),
      new Date('2024-06-17'),
    ]

    it('should identify blocked date', () => {
      expect(isDateBlocked(new Date('2024-06-15'), blockedDates)).toBe(true)
    })

    it('should identify non-blocked date', () => {
      expect(isDateBlocked(new Date('2024-06-14'), blockedDates)).toBe(false)
    })

    it('should handle time components when checking dates', () => {
      // Should match even with different time
      const dateWithTime = new Date('2024-06-15T14:30:00')
      expect(isDateBlocked(dateWithTime, blockedDates)).toBe(true)
    })
  })

  describe('Blocked dates from bookings', () => {
    it('should generate blocked dates from confirmed booking', () => {
      const bookings: Booking[] = [{
        id: 'booking-1',
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-13'),
        status: 'CONFIRMED',
      }]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        []
      )

      // Should block June 10, 11, 12, 13 (check-in to check-out inclusive)
      expect(result.length).toBe(4)
    })

    it('should generate blocked dates from pending booking', () => {
      const bookings: Booking[] = [{
        id: 'booking-1',
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-12'),
        status: 'PENDING',
      }]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        []
      )

      expect(result.length).toBe(3)
    })

    it('should NOT generate blocked dates from cancelled booking', () => {
      const bookings: Booking[] = [{
        id: 'booking-1',
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-15'),
        status: 'CANCELLED',
      }]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        []
      )

      expect(result.length).toBe(0)
    })

    it('should merge blocked dates from multiple bookings', () => {
      const bookings: Booking[] = [
        {
          id: 'booking-1',
          checkIn: new Date('2024-06-10'),
          checkOut: new Date('2024-06-12'),
          status: 'CONFIRMED',
        },
        {
          id: 'booking-2',
          checkIn: new Date('2024-06-20'),
          checkOut: new Date('2024-06-22'),
          status: 'CONFIRMED',
        },
      ]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        []
      )

      expect(result.length).toBe(6) // 3 + 3 days
    })
  })

  describe('Blocked dates from manual blocks', () => {
    it('should include manually blocked dates', () => {
      const blockedDates: BlockedDate[] = [{
        startDate: new Date('2024-06-20'),
        endDate: new Date('2024-06-25'),
        source: 'manual',
      }]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        [],
        blockedDates
      )

      expect(result.length).toBe(6) // June 20-25 inclusive
    })

    it('should merge booking and manual blocks', () => {
      const bookings: Booking[] = [{
        id: 'booking-1',
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-12'),
        status: 'CONFIRMED',
      }]

      const blockedDates: BlockedDate[] = [{
        startDate: new Date('2024-06-20'),
        endDate: new Date('2024-06-22'),
        source: 'ical',
      }]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        blockedDates
      )

      expect(result.length).toBe(6) // 3 + 3 days
    })

    it('should deduplicate overlapping blocked dates', () => {
      const blockedDates: BlockedDate[] = [
        {
          startDate: new Date('2024-06-10'),
          endDate: new Date('2024-06-15'),
          source: 'manual',
        },
        {
          startDate: new Date('2024-06-12'),
          endDate: new Date('2024-06-18'),
          source: 'ical',
        },
      ]

      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        [],
        blockedDates
      )

      // June 10-18 = 9 unique days
      expect(result.length).toBe(9)
    })
  })

  describe('Booking availability check', () => {
    const existingBookings: Booking[] = [
      {
        id: 'booking-1',
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-15'),
        status: 'CONFIRMED',
      },
      {
        id: 'booking-2',
        checkIn: new Date('2024-06-20'),
        checkOut: new Date('2024-06-25'),
        status: 'CONFIRMED',
      },
    ]

    it('should allow booking in available gap', () => {
      const result = canBookDateRange(
        new Date('2024-06-15'), // Same as checkout of booking-1 (allowed)
        new Date('2024-06-18'),
        existingBookings,
        []
      )

      expect(result.available).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should reject booking that overlaps existing', () => {
      const result = canBookDateRange(
        new Date('2024-06-12'),
        new Date('2024-06-18'),
        existingBookings,
        []
      )

      expect(result.available).toBe(false)
      expect(result.conflicts).toContain('Conflicts with booking booking-1')
    })

    it('should reject booking that spans multiple existing bookings', () => {
      const result = canBookDateRange(
        new Date('2024-06-12'),
        new Date('2024-06-22'),
        existingBookings,
        []
      )

      expect(result.available).toBe(false)
      expect(result.conflicts.length).toBe(2)
    })

    it('should allow booking before any existing bookings', () => {
      const result = canBookDateRange(
        new Date('2024-06-01'),
        new Date('2024-06-05'),
        existingBookings,
        []
      )

      expect(result.available).toBe(true)
    })

    it('should allow booking after all existing bookings', () => {
      const result = canBookDateRange(
        new Date('2024-06-25'),
        new Date('2024-06-30'),
        existingBookings,
        []
      )

      expect(result.available).toBe(true)
    })

    it('should ignore cancelled bookings when checking availability', () => {
      const bookingsWithCancelled: Booking[] = [
        ...existingBookings,
        {
          id: 'booking-cancelled',
          checkIn: new Date('2024-06-15'),
          checkOut: new Date('2024-06-18'),
          status: 'CANCELLED',
        },
      ]

      const result = canBookDateRange(
        new Date('2024-06-15'),
        new Date('2024-06-18'),
        bookingsWithCancelled,
        []
      )

      expect(result.available).toBe(true)
    })

    it('should reject booking that overlaps manual block', () => {
      const blockedDates: BlockedDate[] = [{
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-05'),
        source: 'maintenance',
      }]

      const result = canBookDateRange(
        new Date('2024-07-03'),
        new Date('2024-07-10'),
        [],
        blockedDates
      )

      expect(result.available).toBe(false)
      expect(result.conflicts[0]).toContain('maintenance')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty booking list', () => {
      const result = canBookDateRange(
        new Date('2024-06-01'),
        new Date('2024-06-10'),
        [],
        []
      )

      expect(result.available).toBe(true)
    })

    it('should handle date range filtering at boundaries', () => {
      const bookings: Booking[] = [{
        id: 'booking-1',
        checkIn: new Date('2024-06-28'),
        checkOut: new Date('2024-07-05'),
        status: 'CONFIRMED',
      }]

      // Query only June
      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        bookings,
        []
      )

      // Should only include June 28, 29, 30
      expect(result.length).toBe(3)
    })

    it('should handle back-to-back bookings correctly', () => {
      const backToBackBookings: Booking[] = [
        {
          id: 'booking-1',
          checkIn: new Date('2024-06-10'),
          checkOut: new Date('2024-06-15'),
          status: 'CONFIRMED',
        },
        {
          id: 'booking-2',
          checkIn: new Date('2024-06-15'),
          checkOut: new Date('2024-06-20'),
          status: 'CONFIRMED',
        },
      ]

      // Trying to book exactly between them should work (same-day turnaround)
      // But in practice we include checkout day in blocked dates
      const result = getBlockedDatesInRange(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        backToBackBookings,
        []
      )

      // June 10-15 (6 days) + June 15-20 (6 days) with overlap on 15 = 11 unique days
      expect(result.length).toBe(11)
    })
  })
})
