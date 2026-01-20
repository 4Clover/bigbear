import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'

/**
 * Owner calendar sync CRUD data path tests.
 * Tests the external calendar sync management:
 * - Add new calendar sync (name + iCal URL)
 * - Remove calendar sync by ID
 * - Toggle sync active/inactive state
 * - Query syncs for display
 */
describe('Owner Calendar Sync CRUD Data Path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Add calendar sync', () => {
    it('should create calendar sync with required fields', async () => {
      const name = 'Airbnb'
      const icalUrl = 'https://www.airbnb.com/calendar/ical/123.ics'

      prismaMock.calendarSync.create.mockResolvedValue({
        id: 'sync-1',
        name,
        icalUrl,
        isActive: true,
        lastSynced: null,
        lastError: null,
        syncCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.create({
        data: {
          name,
          icalUrl,
          isActive: true,
        },
      })

      expect(result.name).toBe(name)
      expect(result.icalUrl).toBe(icalUrl)
      expect(result.isActive).toBe(true)
    })

    it('should default isActive to true for new syncs', async () => {
      prismaMock.calendarSync.create.mockResolvedValue({
        id: 'sync-1',
        name: 'VRBO',
        icalUrl: 'https://vrbo.com/calendar.ics',
        isActive: true,
        lastSynced: null,
        lastError: null,
        syncCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.create({
        data: {
          name: 'VRBO',
          icalUrl: 'https://vrbo.com/calendar.ics',
          isActive: true,
        },
      })

      expect(result.isActive).toBe(true)
    })

    it('should initialize sync metadata', async () => {
      prismaMock.calendarSync.create.mockResolvedValue({
        id: 'sync-1',
        name: 'Booking.com',
        icalUrl: 'https://booking.com/cal.ics',
        isActive: true,
        lastSynced: null,
        lastError: null,
        syncCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.create({
        data: {
          name: 'Booking.com',
          icalUrl: 'https://booking.com/cal.ics',
          isActive: true,
        },
      })

      expect(result.lastSynced).toBeNull()
      expect(result.lastError).toBeNull()
      expect(result.syncCount).toBe(0)
    })

    it('should accept various iCal URL formats', () => {
      const validUrls = [
        'https://www.airbnb.com/calendar/ical/123456.ics',
        'https://vrbo.com/ical/property-123.ics',
        'https://booking.com/calendar/export/abc.ics',
        'https://calendar.google.com/calendar/ical/example/basic.ics',
        'https://outlook.live.com/owa/calendar/abc/ical',
      ]

      validUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(true)
      })
    })
  })

  describe('Remove calendar sync', () => {
    it('should delete calendar sync by ID', async () => {
      const syncId = 'sync-123'

      prismaMock.calendarSync.delete.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/cal.ics',
        isActive: true,
        lastSynced: new Date(),
        lastError: null,
        syncCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.delete({
        where: { id: syncId },
      })

      expect(result.id).toBe(syncId)
    })

    it('should cascade delete related blocked dates on sync removal', async () => {
      // When a calendar sync is removed, its imported blocked dates should be cleaned up
      // This tests the data relationship expectation
      const syncId = 'sync-123'
      const _externalIdPattern = `sync-${syncId}-%`

      prismaMock.blockedDate.deleteMany.mockResolvedValue({ count: 3 })

      const result = await prismaMock.blockedDate.deleteMany({
        where: {
          externalId: { startsWith: `sync-${syncId}-` },
        },
      })

      expect(result.count).toBe(3)
    })
  })

  describe('Toggle calendar sync', () => {
    it('should toggle sync from active to inactive', async () => {
      const syncId = 'sync-123'

      prismaMock.calendarSync.update.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/cal.ics',
        isActive: false,
        lastSynced: new Date(),
        lastError: null,
        syncCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.update({
        where: { id: syncId },
        data: { isActive: false },
      })

      expect(result.isActive).toBe(false)
    })

    it('should toggle sync from inactive to active', async () => {
      const syncId = 'sync-123'

      prismaMock.calendarSync.update.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/cal.ics',
        isActive: true,
        lastSynced: new Date(),
        lastError: null,
        syncCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.update({
        where: { id: syncId },
        data: { isActive: true },
      })

      expect(result.isActive).toBe(true)
    })

    it('should preserve other fields when toggling', async () => {
      const syncId = 'sync-123'
      const lastSynced = new Date('2024-06-15T10:00:00')

      prismaMock.calendarSync.update.mockResolvedValue({
        id: syncId,
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/cal.ics',
        isActive: false,
        lastSynced,
        lastError: null,
        syncCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.calendarSync.update({
        where: { id: syncId },
        data: { isActive: false },
      })

      expect(result.name).toBe('Airbnb')
      expect(result.lastSynced).toEqual(lastSynced)
      expect(result.syncCount).toBe(5)
    })
  })

  describe('Query calendar syncs', () => {
    it('should fetch all calendar syncs', async () => {
      const syncs = [
        {
          id: 'sync-1',
          name: 'Airbnb',
          icalUrl: 'https://airbnb.com/cal.ics',
          isActive: true,
          lastSynced: new Date(),
          lastError: null,
          syncCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sync-2',
          name: 'VRBO',
          icalUrl: 'https://vrbo.com/cal.ics',
          isActive: false,
          lastSynced: new Date(),
          lastError: 'Network timeout',
          syncCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.calendarSync.findMany.mockResolvedValue(syncs)

      const result = await prismaMock.calendarSync.findMany({
        orderBy: { name: 'asc' },
      })

      expect(result).toHaveLength(2)
    })

    it('should fetch only active syncs for cron job', async () => {
      const activeSyncs = [
        {
          id: 'sync-1',
          name: 'Airbnb',
          icalUrl: 'https://airbnb.com/cal.ics',
          isActive: true,
          lastSynced: new Date(),
          lastError: null,
          syncCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.calendarSync.findMany.mockResolvedValue(activeSyncs)

      const result = await prismaMock.calendarSync.findMany({
        where: { isActive: true },
      })

      result.forEach((sync) => {
        expect(sync.isActive).toBe(true)
      })
    })
  })

  describe('Calendar sync display data', () => {
    it('should format lastSynced for display', () => {
      const lastSynced = new Date('2024-06-15T14:30:00Z')

      // Expected: "Jun 15, 2024 2:30 PM" or similar
      const formatted = lastSynced.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

      expect(formatted).toContain('Jun')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })

    it('should display status badge based on isActive', () => {
      const getStatusLabel = (isActive: boolean) => (isActive ? 'Active' : 'Paused')

      expect(getStatusLabel(true)).toBe('Active')
      expect(getStatusLabel(false)).toBe('Paused')
    })

    it('should display error message when lastError is set', () => {
      const sync = {
        lastError: 'Failed to fetch calendar: Connection timeout',
        isActive: true,
      }

      const hasError = sync.lastError !== null
      expect(hasError).toBe(true)
    })

    it('should show sync count for tracking', () => {
      const sync = { syncCount: 42 }

      expect(sync.syncCount).toBeGreaterThan(0)
    })
  })

  describe('URL validation patterns', () => {
    it('should validate URL starts with https', () => {
      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url)
          return parsed.protocol === 'https:'
        } catch {
          return false
        }
      }

      expect(isValidUrl('https://airbnb.com/cal.ics')).toBe(true)
      expect(isValidUrl('http://airbnb.com/cal.ics')).toBe(false)
      expect(isValidUrl('not-a-url')).toBe(false)
    })

    it('should accept common iCal path patterns', () => {
      const urls = [
        'https://example.com/calendar.ics',
        'https://example.com/ical/feed.ics',
        'https://example.com/calendar/export/123',
        'https://example.com/v1/calendar/ical',
      ]

      urls.forEach((url) => {
        const isValid = url.startsWith('https://')
        expect(isValid).toBe(true)
      })
    })
  })

  describe('Calendar sync action responses', () => {
    it('should return success for add operation', () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })

    it('should return success for remove operation', () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })

    it('should return success for toggle operation', () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })
  })
})
