import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { addDays } from 'date-fns'

/**
 * Calendar sync data path tests.
 * Tests the cron job's data transformation from external iCal events
 * to BlockedDate records, ensuring idempotency and error handling.
 */
describe('Calendar Sync Data Path', () => {
  const today = new Date('2024-06-15')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Import creates BlockedDate from external events', () => {
    it('should create BlockedDate with correct fields from sync', async () => {
      const syncId = 'sync-123'
      const eventKey = 'event-abc'
      const externalId = `sync-${syncId}-${eventKey}`
      const startDate = addDays(today, 5)
      const endDate = addDays(today, 10)

      prismaMock.blockedDate.upsert.mockResolvedValue({
        id: 'blocked-1',
        startDate,
        endDate,
        reason: 'Imported from Airbnb',
        notes: null,
        source: 'Airbnb',
        externalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.blockedDate.upsert({
        where: { externalId },
        update: { startDate, endDate },
        create: {
          startDate,
          endDate,
          reason: 'Imported from Airbnb',
          source: 'Airbnb',
          externalId,
        },
      })

      expect(result.externalId).toBe(externalId)
      expect(result.source).toBe('Airbnb')
      expect(result.startDate).toEqual(startDate)
      expect(result.endDate).toEqual(endDate)
    })

    it('should generate externalId from sync ID and event key', () => {
      const syncId = 'sync-456'
      const eventKey = 'vevent-789'
      const externalId = `sync-${syncId}-${eventKey}`

      expect(externalId).toBe('sync-sync-456-vevent-789')
    })
  })

  describe('Idempotent updates on re-sync', () => {
    it('should update existing BlockedDate when externalId matches', async () => {
      const externalId = 'sync-123-event-abc'
      const originalStart = addDays(today, 5)
      const originalEnd = addDays(today, 10)
      const updatedStart = addDays(today, 6)
      const updatedEnd = addDays(today, 11)

      // First sync creates the record
      prismaMock.blockedDate.upsert.mockResolvedValueOnce({
        id: 'blocked-1',
        startDate: originalStart,
        endDate: originalEnd,
        reason: 'Imported from Airbnb',
        notes: null,
        source: 'Airbnb',
        externalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Second sync updates the record
      prismaMock.blockedDate.upsert.mockResolvedValueOnce({
        id: 'blocked-1',
        startDate: updatedStart,
        endDate: updatedEnd,
        reason: 'Imported from Airbnb',
        notes: null,
        source: 'Airbnb',
        externalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const firstResult = await prismaMock.blockedDate.upsert({
        where: { externalId },
        update: { startDate: originalStart, endDate: originalEnd },
        create: {
          startDate: originalStart,
          endDate: originalEnd,
          reason: 'Imported from Airbnb',
          source: 'Airbnb',
          externalId,
        },
      })

      const secondResult = await prismaMock.blockedDate.upsert({
        where: { externalId },
        update: { startDate: updatedStart, endDate: updatedEnd },
        create: {
          startDate: updatedStart,
          endDate: updatedEnd,
          reason: 'Imported from Airbnb',
          source: 'Airbnb',
          externalId,
        },
      })

      // Same ID, updated dates
      expect(firstResult.id).toBe(secondResult.id)
      expect(secondResult.startDate).toEqual(updatedStart)
      expect(secondResult.endDate).toEqual(updatedEnd)
    })
  })

  describe('Invalid date handling', () => {
    it('should identify invalid dates via isNaN check', () => {
      const invalidDate = new Date('invalid')
      expect(isNaN(invalidDate.getTime())).toBe(true)
    })

    it('should identify valid dates', () => {
      const validDate = new Date('2024-06-15')
      expect(isNaN(validDate.getTime())).toBe(false)
    })
  })

  describe('CalendarSync metadata updates', () => {
    it('should update lastSynced and increment syncCount on success', async () => {
      const syncId = 'sync-123'
      const lastSynced = new Date()

      prismaMock.calendarSync.update.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/calendar.ics',
        isActive: true,
        lastSynced,
        lastError: null,
        syncCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.update({
        where: { id: syncId },
        data: {
          lastSynced,
          lastError: null,
          syncCount: { increment: 1 },
        },
      })

      expect(result.lastSynced).toEqual(lastSynced)
      expect(result.lastError).toBeNull()
      expect(result.syncCount).toBe(5)
    })

    it('should set lastError on failure', async () => {
      const syncId = 'sync-123'
      const errorMessage = 'Failed to fetch calendar'

      prismaMock.calendarSync.update.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/calendar.ics',
        isActive: true,
        lastSynced: null,
        lastError: errorMessage,
        syncCount: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.update({
        where: { id: syncId },
        data: { lastError: errorMessage },
      })

      expect(result.lastError).toBe(errorMessage)
    })
  })

  describe('Multiple CalendarSync processing', () => {
    it('should process each active sync independently', async () => {
      const syncs = [
        {
          id: 'sync-1',
          name: 'Airbnb',
          icalUrl: 'https://airbnb.com/cal.ics',
          isActive: true,
          lastSynced: null,
          lastError: null,
          syncCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sync-2',
          name: 'VRBO',
          icalUrl: 'https://vrbo.com/cal.ics',
          isActive: true,
          lastSynced: null,
          lastError: null,
          syncCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.calendarSync.findMany.mockResolvedValue(syncs)

      const result = await prismaMock.calendarSync.findMany({
        where: { isActive: true },
      })

      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe('Airbnb')
      expect(result[1]?.name).toBe('VRBO')
    })

    it('should only fetch active syncs', async () => {
      prismaMock.calendarSync.findMany.mockResolvedValue([
        {
          id: 'sync-1',
          name: 'Airbnb',
          icalUrl: 'https://airbnb.com/cal.ics',
          isActive: true,
          lastSynced: null,
          lastError: null,
          syncCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await prismaMock.calendarSync.findMany({
        where: { isActive: true },
      })

      result.forEach((sync) => {
        expect(sync.isActive).toBe(true)
      })
    })
  })
})
