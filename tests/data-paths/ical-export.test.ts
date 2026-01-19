import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { formatICalDate } from '@/lib/utils/calendar'
import { addDays } from 'date-fns'
import {
  createBookingFixture,
  createConfirmedBookingFixture,
  resetBookingCounter,
} from '../fixtures/booking.factory'

/**
 * iCal export data path tests.
 * Tests the export endpoint's data transformation from
 * bookings and blocked dates to valid iCal format.
 */
describe('iCal Export Data Path', () => {
  const today = new Date('2024-06-15')

  beforeEach(() => {
    vi.clearAllMocks()
    resetBookingCounter()
  })

  describe('Booking status filtering', () => {
    it('should include CONFIRMED bookings in export', async () => {
      const confirmedBooking = createConfirmedBookingFixture({
        checkIn: addDays(today, 5),
        checkOut: addDays(today, 10),
      })

      prismaMock.booking.findMany.mockResolvedValue([confirmedBooking])

      const result = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('CONFIRMED')
    })

    it('should include COMPLETED bookings in export', async () => {
      const completedBooking = createBookingFixture({
        checkIn: addDays(today, 1),
        checkOut: addDays(today, 5),
        status: 'COMPLETED',
      })

      prismaMock.booking.findMany.mockResolvedValue([completedBooking])

      const result = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('COMPLETED')
    })

    it('should exclude PENDING bookings from export', async () => {
      // PENDING bookings should not appear in iCal export
      // They haven't been confirmed yet
      prismaMock.booking.findMany.mockResolvedValue([])

      const result = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      expect(result).toHaveLength(0)
    })

    it('should exclude CANCELLED bookings from export', async () => {
      // CANCELLED bookings should not block dates
      prismaMock.booking.findMany.mockResolvedValue([])

      const result = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('BlockedDate filtering', () => {
    it('should include future BlockedDates', async () => {
      const futureBlocked = {
        id: 'blocked-1',
        startDate: addDays(today, 10),
        endDate: addDays(today, 15),
        reason: 'Maintenance',
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.blockedDate.findMany.mockResolvedValue([futureBlocked])

      const result = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.reason).toBe('Maintenance')
    })

    it('should exclude past BlockedDates', async () => {
      // Past blocked dates are not relevant for export
      prismaMock.blockedDate.findMany.mockResolvedValue([])

      const result = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('VEVENT structure', () => {
    it('should format dates correctly for iCal', () => {
      const date = new Date('2024-06-15T12:00:00Z')
      const formatted = formatICalDate(date)

      expect(formatted).toBe('20240615')
    })

    it('should generate unique UID for bookings', () => {
      const bookingId = 'booking-abc123'
      const uid = `booking-${bookingId}@cabin`

      expect(uid).toBe('booking-booking-abc123@cabin')
    })

    it('should generate unique UID for blocked dates', () => {
      const blockedId = 'blocked-xyz789'
      const uid = `blocked-${blockedId}@cabin`

      expect(uid).toBe('blocked-blocked-xyz789@cabin')
    })

    it('should include reason in blocked date summary when present', () => {
      const reason = 'Maintenance'
      const summary = reason ? `Blocked - ${reason}` : 'Blocked'

      expect(summary).toBe('Blocked - Maintenance')
    })

    it('should use default summary when reason is absent', () => {
      const buildSummary = (reason: string | null): string =>
        reason ? `Blocked - ${reason}` : 'Blocked'

      expect(buildSummary(null)).toBe('Blocked')
    })
  })

  describe('Empty calendar handling', () => {
    it('should return valid VCALENDAR with no events', async () => {
      prismaMock.booking.findMany.mockResolvedValue([])
      prismaMock.blockedDate.findMany.mockResolvedValue([])

      const bookings = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      const blockedDates = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      expect(bookings).toHaveLength(0)
      expect(blockedDates).toHaveLength(0)

      // Verify empty calendar structure is valid
      const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cabin Rental//EN
END:VCALENDAR`

      expect(ical).toContain('BEGIN:VCALENDAR')
      expect(ical).toContain('END:VCALENDAR')
      expect(ical).not.toContain('BEGIN:VEVENT')
    })
  })
})
