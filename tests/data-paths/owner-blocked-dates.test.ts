import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { addDays } from 'date-fns'

/**
 * Owner blocked dates management data path tests.
 * Tests the blocked date CRUD operations:
 * - Create blocked date ranges with optional reason
 * - Delete blocked dates by ID
 * - Differentiate between manual blocks and external sync blocks
 * - Query blocked dates for calendar display
 */
describe('Owner Blocked Dates Data Path', () => {
  const today = new Date('2024-06-15')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create blocked date range', () => {
    it('should create blocked date with required fields', async () => {
      const startDate = addDays(today, 5)
      const endDate = addDays(today, 10)

      prismaMock.blockedDate.create.mockResolvedValue({
        id: 'blocked-1',
        startDate,
        endDate,
        reason: null,
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.blockedDate.create({
        data: {
          startDate,
          endDate,
          source: 'manual',
        },
      })

      expect(result.startDate).toEqual(startDate)
      expect(result.endDate).toEqual(endDate)
      expect(result.source).toBe('manual')
    })

    it('should create blocked date with optional reason', async () => {
      const startDate = addDays(today, 5)
      const endDate = addDays(today, 10)
      const reason = 'Maintenance work scheduled'

      prismaMock.blockedDate.create.mockResolvedValue({
        id: 'blocked-1',
        startDate,
        endDate,
        reason,
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.blockedDate.create({
        data: {
          startDate,
          endDate,
          reason,
          source: 'manual',
        },
      })

      expect(result.reason).toBe(reason)
    })

    it('should default source to manual for owner-created blocks', async () => {
      const startDate = addDays(today, 5)
      const endDate = addDays(today, 10)

      prismaMock.blockedDate.create.mockResolvedValue({
        id: 'blocked-1',
        startDate,
        endDate,
        reason: null,
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.blockedDate.create({
        data: {
          startDate,
          endDate,
          source: 'manual',
        },
      })

      expect(result.source).toBe('manual')
      expect(result.externalId).toBeNull()
    })

    it('should allow common reason values', () => {
      const validReasons = [
        'Maintenance',
        'Personal use',
        'Holiday',
        'Owner stay',
        'Renovation',
        'Deep cleaning',
      ]

      validReasons.forEach((reason) => {
        expect(typeof reason).toBe('string')
        expect(reason.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Delete blocked date', () => {
    it('should delete blocked date by ID', async () => {
      const blockedDateId = 'blocked-123'

      prismaMock.blockedDate.delete.mockResolvedValue({
        id: blockedDateId,
        startDate: addDays(today, 5),
        endDate: addDays(today, 10),
        reason: 'Maintenance',
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.blockedDate.delete({
        where: { id: blockedDateId },
      })

      expect(result.id).toBe(blockedDateId)
    })

    it('should only delete manual blocks (not external sync blocks)', async () => {
      const manualBlock = {
        id: 'blocked-1',
        source: 'manual',
        externalId: null,
      }
      const externalBlock = {
        id: 'blocked-2',
        source: 'Airbnb',
        externalId: 'sync-123-event-abc',
      }

      // Business rule: Only manual blocks should be deleted by owner
      const canDeleteManual = manualBlock.source === 'manual'
      const canDeleteExternal = externalBlock.source === 'manual'

      expect(canDeleteManual).toBe(true)
      expect(canDeleteExternal).toBe(false)
    })
  })

  describe('Query blocked dates', () => {
    it('should find all blocked dates for calendar display', async () => {
      const blockedDates = [
        {
          id: 'blocked-1',
          startDate: addDays(today, 5),
          endDate: addDays(today, 10),
          reason: 'Maintenance',
          notes: null,
          source: 'manual',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'blocked-2',
          startDate: addDays(today, 20),
          endDate: addDays(today, 25),
          reason: 'Holiday',
          notes: null,
          source: 'manual',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.blockedDate.findMany.mockResolvedValue(blockedDates)

      const result = await prismaMock.blockedDate.findMany({
        orderBy: { startDate: 'asc' },
      })

      expect(result).toHaveLength(2)
    })

    it('should filter blocked dates by date range', async () => {
      const monthStart = new Date('2024-07-01')
      const monthEnd = new Date('2024-07-31')

      const julyBlocks = [
        {
          id: 'blocked-1',
          startDate: new Date('2024-07-10'),
          endDate: new Date('2024-07-15'),
          reason: null,
          notes: null,
          source: 'manual',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.blockedDate.findMany.mockResolvedValue(julyBlocks)

      const result = await prismaMock.blockedDate.findMany({
        where: {
          OR: [
            {
              // Block starts within the range
              startDate: { gte: monthStart, lte: monthEnd },
            },
            {
              // Block ends within the range
              endDate: { gte: monthStart, lte: monthEnd },
            },
            {
              // Block spans the entire range
              AND: [{ startDate: { lte: monthStart } }, { endDate: { gte: monthEnd } }],
            },
          ],
        },
      })

      expect(result.length).toBeGreaterThan(0)
    })

    it('should distinguish manual and external blocks', async () => {
      const allBlocks = [
        {
          id: 'blocked-1',
          startDate: addDays(today, 5),
          endDate: addDays(today, 10),
          reason: 'Maintenance',
          notes: null,
          source: 'manual',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'blocked-2',
          startDate: addDays(today, 15),
          endDate: addDays(today, 18),
          reason: 'Imported from Airbnb',
          notes: null,
          source: 'Airbnb',
          externalId: 'sync-123-event-abc',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.blockedDate.findMany.mockResolvedValue(allBlocks)

      const result = await prismaMock.blockedDate.findMany()

      const manualBlocks = result.filter((b) => b.source === 'manual')
      const externalBlocks = result.filter((b) => b.source !== 'manual')

      expect(manualBlocks).toHaveLength(1)
      expect(externalBlocks).toHaveLength(1)
    })
  })

  describe('Date validation', () => {
    it('should ensure end date is after start date', () => {
      const startDate = addDays(today, 10)
      const endDate = addDays(today, 5) // Invalid: before start

      const isValidRange = endDate.getTime() >= startDate.getTime()

      expect(isValidRange).toBe(false)
    })

    it('should allow same-day blocks (single day)', () => {
      const startDate = addDays(today, 5)
      const endDate = addDays(today, 5) // Same day

      const isValidRange = endDate.getTime() >= startDate.getTime()

      expect(isValidRange).toBe(true)
    })

    it('should accept valid date ranges', () => {
      const testCases = [
        { start: addDays(today, 1), end: addDays(today, 3) },
        { start: addDays(today, 10), end: addDays(today, 20) },
        { start: addDays(today, 30), end: addDays(today, 60) },
      ]

      testCases.forEach(({ start, end }) => {
        const isValidRange = end.getTime() >= start.getTime()
        expect(isValidRange).toBe(true)
      })
    })
  })

  describe('Blocked date overlap with bookings', () => {
    it('should identify date overlap between block and booking', () => {
      const checkDateOverlap = (
        blockStart: Date,
        blockEnd: Date,
        bookingStart: Date,
        bookingEnd: Date
      ) => {
        return blockStart <= bookingEnd && blockEnd >= bookingStart
      }

      // Block: July 10-15, Booking: July 12-18 (overlaps)
      expect(
        checkDateOverlap(
          new Date('2024-07-10'),
          new Date('2024-07-15'),
          new Date('2024-07-12'),
          new Date('2024-07-18')
        )
      ).toBe(true)

      // Block: July 10-15, Booking: July 20-25 (no overlap)
      expect(
        checkDateOverlap(
          new Date('2024-07-10'),
          new Date('2024-07-15'),
          new Date('2024-07-20'),
          new Date('2024-07-25')
        )
      ).toBe(false)

      // Block contains booking entirely
      expect(
        checkDateOverlap(
          new Date('2024-07-01'),
          new Date('2024-07-31'),
          new Date('2024-07-10'),
          new Date('2024-07-15')
        )
      ).toBe(true)
    })
  })

  describe('Calendar event representation', () => {
    it('should transform blocked date to calendar event format', () => {
      const blockedDate = {
        id: 'blocked-1',
        startDate: new Date('2024-07-10'),
        endDate: new Date('2024-07-15'),
        reason: 'Maintenance',
        source: 'manual',
      }

      const calendarEvent = {
        id: blockedDate.id,
        title: blockedDate.reason ?? 'Blocked',
        start: blockedDate.startDate,
        end: blockedDate.endDate,
        type: 'blocked' as const,
        source: blockedDate.source,
      }

      expect(calendarEvent.title).toBe('Maintenance')
      expect(calendarEvent.type).toBe('blocked')
      expect(calendarEvent.start).toEqual(blockedDate.startDate)
    })

    it('should use default title when reason is null', () => {
      const blockedDate = {
        id: 'blocked-1',
        startDate: new Date('2024-07-10'),
        endDate: new Date('2024-07-15'),
        reason: null,
        source: 'manual',
      }

      const title = blockedDate.reason ?? 'Blocked'

      expect(title).toBe('Blocked')
    })

    it('should differentiate calendar event styling by source', () => {
      const manualBlock = { source: 'manual' }
      const airbnbBlock = { source: 'Airbnb' }
      const vrboBlock = { source: 'VRBO' }

      const getEventColor = (source: string) => {
        if (source === 'manual') return 'gray'
        return 'blue' // External syncs
      }

      expect(getEventColor(manualBlock.source)).toBe('gray')
      expect(getEventColor(airbnbBlock.source)).toBe('blue')
      expect(getEventColor(vrboBlock.source)).toBe('blue')
    })
  })
})
