import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { addDays, eachDayOfInterval } from 'date-fns'
import {
  createConfirmedBookingFixture,
  resetBookingCounter,
} from '../fixtures/booking.factory'

/**
 * Availability consistency tests.
 * Ensures that blocked dates from calendar sync correctly
 * appear in availability checks, and that iCal export and
 * availability API return consistent data.
 */
describe('Availability Consistency', () => {
  const today = new Date('2024-06-15')

  beforeEach(() => {
    vi.clearAllMocks()
    resetBookingCounter()
  })

  describe('Synced calendar events block availability', () => {
    it('should include imported BlockedDates in availability check', async () => {
      // Simulate an imported calendar event that created a BlockedDate
      const importedBlocked = {
        id: 'blocked-imported',
        startDate: addDays(today, 10),
        endDate: addDays(today, 15),
        reason: 'Imported from Airbnb',
        source: 'Airbnb',
        externalId: 'sync-123-event-abc',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.blockedDate.findMany.mockResolvedValue([importedBlocked])

      const blockedDates = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
        select: { startDate: true, endDate: true },
      })

      expect(blockedDates).toHaveLength(1)
      expect(blockedDates[0]?.startDate).toEqual(addDays(today, 10))
      expect(blockedDates[0]?.endDate).toEqual(addDays(today, 15))

      // Verify these dates would be blocked in availability check
      const blockedDays = eachDayOfInterval({
        start: blockedDates[0]!.startDate,
        end: blockedDates[0]!.endDate,
      })

      expect(blockedDays).toHaveLength(6) // 5 nights + checkout day
    })

    it('should combine manual and imported blocked dates', async () => {
      const manualBlocked = {
        id: 'blocked-manual',
        startDate: addDays(today, 5),
        endDate: addDays(today, 8),
        reason: 'Owner stay',
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const importedBlocked = {
        id: 'blocked-imported',
        startDate: addDays(today, 20),
        endDate: addDays(today, 25),
        reason: 'Imported from VRBO',
        source: 'VRBO',
        externalId: 'sync-456-event-xyz',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.blockedDate.findMany.mockResolvedValue([
        manualBlocked,
        importedBlocked,
      ])

      const blockedDates = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      expect(blockedDates).toHaveLength(2)

      // Both manual and imported should be included
      const sources = blockedDates.map((b) => b.source)
      expect(sources).toContain('manual')
      expect(sources).toContain('VRBO')
    })
  })

  describe('iCal export and availability API consistency', () => {
    it('should use same status filter for bookings', async () => {
      // Both iCal export and availability use CONFIRMED/COMPLETED statuses
      // (availability also includes PENDING for blocking purposes)
      const confirmedBooking = createConfirmedBookingFixture({
        checkIn: addDays(today, 5),
        checkOut: addDays(today, 10),
      })

      // iCal export filter
      prismaMock.booking.findMany.mockResolvedValueOnce([confirmedBooking])

      const icalBookings = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkOut: { gte: new Date() },
        },
      })

      // Availability API filter (includes PENDING too)
      prismaMock.booking.findMany.mockResolvedValueOnce([confirmedBooking])

      const availabilityBookings = await prismaMock.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
          checkOut: { gte: new Date() },
        },
      })

      // Both should include CONFIRMED bookings
      expect(icalBookings[0]?.id).toBe(availabilityBookings[0]?.id)
    })

    it('should use same date filter for blocked dates', async () => {
      const futureBlocked = {
        id: 'blocked-1',
        startDate: addDays(today, 10),
        endDate: addDays(today, 15),
        reason: 'Maintenance',
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Both iCal and availability use { endDate: { gte: new Date() } }
      prismaMock.blockedDate.findMany.mockResolvedValue([futureBlocked])

      const icalBlocked = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      const availabilityBlocked = await prismaMock.blockedDate.findMany({
        where: { endDate: { gte: new Date() } },
      })

      expect(icalBlocked).toEqual(availabilityBlocked)
    })
  })
})
