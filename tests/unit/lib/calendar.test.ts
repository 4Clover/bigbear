import { describe, it, expect } from 'vitest'
import {
  isDateRangeAvailable,
  getUnavailableDates,
  formatICalDate,
  type DateRange as _DateRange,
} from '@/lib/utils/calendar'
import { addDays } from 'date-fns'

/**
 * Calendar utility tests.
 * Tests date range availability checking and unavailable date collection.
 */
describe('Calendar Utilities', () => {
  const today = new Date('2024-06-15')

  describe('isDateRangeAvailable', () => {
    describe('with no existing bookings or blocked dates', () => {
      it('should return true for any date range', () => {
        const result = isDateRangeAvailable(addDays(today, 1), addDays(today, 5), [], [])
        expect(result).toBe(true)
      })
    })

    describe('with existing bookings', () => {
      const bookings = [{ checkIn: addDays(today, 10), checkOut: addDays(today, 15) }]

      it('should return true for dates before existing booking', () => {
        const result = isDateRangeAvailable(addDays(today, 1), addDays(today, 5), bookings, [])
        expect(result).toBe(true)
      })

      it('should return true for dates after existing booking', () => {
        const result = isDateRangeAvailable(addDays(today, 20), addDays(today, 25), bookings, [])
        expect(result).toBe(true)
      })

      it('should return false when check-in falls within existing booking', () => {
        const result = isDateRangeAvailable(addDays(today, 12), addDays(today, 18), bookings, [])
        expect(result).toBe(false)
      })

      it('should return false when check-out falls within existing booking', () => {
        const result = isDateRangeAvailable(addDays(today, 8), addDays(today, 12), bookings, [])
        expect(result).toBe(false)
      })

      it('should return false when requested range surrounds existing booking', () => {
        const result = isDateRangeAvailable(addDays(today, 8), addDays(today, 18), bookings, [])
        expect(result).toBe(false)
      })

      it('should return false when existing booking surrounds requested range', () => {
        const result = isDateRangeAvailable(addDays(today, 11), addDays(today, 14), bookings, [])
        expect(result).toBe(false)
      })

      it('should allow check-in on same day as existing check-out (same-day turnover)', () => {
        const result = isDateRangeAvailable(
          addDays(today, 15), // Same as booking checkout
          addDays(today, 20),
          bookings,
          []
        )
        expect(result).toBe(true)
      })

      it('should disallow check-out on same day as existing check-in', () => {
        const result = isDateRangeAvailable(
          addDays(today, 5),
          addDays(today, 10), // Same as booking checkin
          bookings,
          []
        )
        // checkout is exclusive, so ending on check-in day should be fine
        expect(result).toBe(true)
      })
    })

    describe('with blocked dates', () => {
      const blockedDates = [{ startDate: addDays(today, 20), endDate: addDays(today, 25) }]

      it('should return false when dates overlap with blocked range', () => {
        const result = isDateRangeAvailable(
          addDays(today, 22),
          addDays(today, 28),
          [],
          blockedDates
        )
        expect(result).toBe(false)
      })

      it('should return true when dates are outside blocked range', () => {
        const result = isDateRangeAvailable(addDays(today, 1), addDays(today, 5), [], blockedDates)
        expect(result).toBe(true)
      })
    })

    describe('with both bookings and blocked dates', () => {
      const bookings = [{ checkIn: addDays(today, 10), checkOut: addDays(today, 15) }]
      const blockedDates = [{ startDate: addDays(today, 20), endDate: addDays(today, 25) }]

      it('should return false when overlapping booking', () => {
        const result = isDateRangeAvailable(
          addDays(today, 12),
          addDays(today, 18),
          bookings,
          blockedDates
        )
        expect(result).toBe(false)
      })

      it('should return false when overlapping blocked dates', () => {
        const result = isDateRangeAvailable(
          addDays(today, 22),
          addDays(today, 28),
          bookings,
          blockedDates
        )
        expect(result).toBe(false)
      })

      it('should return true when between booking and blocked dates', () => {
        const result = isDateRangeAvailable(
          addDays(today, 16),
          addDays(today, 19),
          bookings,
          blockedDates
        )
        expect(result).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle multiple bookings', () => {
        const bookings = [
          { checkIn: addDays(today, 5), checkOut: addDays(today, 8) },
          { checkIn: addDays(today, 15), checkOut: addDays(today, 20) },
          { checkIn: addDays(today, 25), checkOut: addDays(today, 30) },
        ]

        // Gap between first and second booking
        expect(isDateRangeAvailable(addDays(today, 9), addDays(today, 14), bookings, [])).toBe(true)

        // Overlapping with second booking
        expect(isDateRangeAvailable(addDays(today, 16), addDays(today, 22), bookings, [])).toBe(
          false
        )
      })

      it('should handle single-day ranges', () => {
        const bookings = [{ checkIn: addDays(today, 10), checkOut: addDays(today, 15) }]

        // Single day before booking
        expect(isDateRangeAvailable(addDays(today, 5), addDays(today, 6), bookings, [])).toBe(true)

        // Single day during booking
        expect(isDateRangeAvailable(addDays(today, 12), addDays(today, 13), bookings, [])).toBe(
          false
        )
      })
    })
  })

  describe('getUnavailableDates', () => {
    it('should return empty array when no bookings or blocked dates', () => {
      const result = getUnavailableDates([], [])
      expect(result).toEqual([])
    })

    it('should return booking dates as unavailable ranges', () => {
      const bookings = [{ checkIn: addDays(today, 10), checkOut: addDays(today, 15) }]

      const result = getUnavailableDates(bookings, [])

      expect(result).toHaveLength(1)
      expect(result[0]!.start).toEqual(addDays(today, 10))
      expect(result[0]!.end).toEqual(addDays(today, 15))
    })

    it('should return blocked dates as unavailable ranges', () => {
      const blockedDates = [{ startDate: addDays(today, 20), endDate: addDays(today, 25) }]

      const result = getUnavailableDates([], blockedDates)

      expect(result).toHaveLength(1)
      expect(result[0]!.start).toEqual(addDays(today, 20))
      expect(result[0]!.end).toEqual(addDays(today, 25))
    })

    it('should combine and sort bookings and blocked dates', () => {
      const bookings = [{ checkIn: addDays(today, 20), checkOut: addDays(today, 25) }]
      const blockedDates = [{ startDate: addDays(today, 5), endDate: addDays(today, 10) }]

      const result = getUnavailableDates(bookings, blockedDates)

      expect(result).toHaveLength(2)
      // Should be sorted by start date
      expect(result[0]!.start).toEqual(addDays(today, 5))
      expect(result[1]!.start).toEqual(addDays(today, 20))
    })

    it('should handle multiple items and sort correctly', () => {
      const bookings = [
        { checkIn: addDays(today, 30), checkOut: addDays(today, 35) },
        { checkIn: addDays(today, 10), checkOut: addDays(today, 15) },
      ]
      const blockedDates = [
        { startDate: addDays(today, 50), endDate: addDays(today, 55) },
        { startDate: addDays(today, 1), endDate: addDays(today, 5) },
      ]

      const result = getUnavailableDates(bookings, blockedDates)

      expect(result).toHaveLength(4)
      expect(result[0]!.start).toEqual(addDays(today, 1))
      expect(result[1]!.start).toEqual(addDays(today, 10))
      expect(result[2]!.start).toEqual(addDays(today, 30))
      expect(result[3]!.start).toEqual(addDays(today, 50))
    })
  })

  describe('formatICalDate', () => {
    it('should format date as YYYYMMDD', () => {
      const date = new Date('2024-06-15T12:00:00Z')
      const result = formatICalDate(date)
      expect(result).toBe('20240615')
    })

    it('should handle single-digit months and days', () => {
      const date = new Date('2024-01-05T12:00:00Z')
      const result = formatICalDate(date)
      expect(result).toBe('20240105')
    })

    it('should handle end of year dates', () => {
      const date = new Date('2024-12-31T12:00:00Z')
      const result = formatICalDate(date)
      expect(result).toBe('20241231')
    })

    it('should handle start of year dates', () => {
      const date = new Date('2025-01-01T12:00:00Z')
      const result = formatICalDate(date)
      expect(result).toBe('20250101')
    })
  })
})
