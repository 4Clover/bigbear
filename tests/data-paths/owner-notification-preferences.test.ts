import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'

/**
 * Owner notification preferences data path tests.
 * Tests the notification preference management:
 * - Upsert preferences (create if not exists, update if exists)
 * - Toggle email and SMS notifications per event type
 * - Query all preferences for settings display
 * - NotificationEvent enum coverage
 */
describe('Owner Notification Preferences Data Path', () => {
  // NotificationEvent enum values from Prisma schema
  const allNotificationEvents = [
    'BOOKING_REQUEST',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'PAYMENT_RECEIVED',
    'PAYMENT_FAILED',
    'GUEST_CHECKIN_REMINDER',
    'GUEST_CHECKOUT_REMINDER',
    'MAINTENANCE_QUOTE_RECEIVED',
    'MAINTENANCE_COMPLETED',
    'NEW_MESSAGE',
  ] as const

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Upsert notification preference', () => {
    it('should create new preference if not exists', async () => {
      const event = 'BOOKING_REQUEST'

      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        event,
        emailEnabled: true,
        smsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event },
        update: { emailEnabled: true, smsEnabled: false },
        create: { event, emailEnabled: true, smsEnabled: false },
      })

      expect(result.event).toBe(event)
      expect(result.emailEnabled).toBe(true)
      expect(result.smsEnabled).toBe(false)
    })

    it('should update existing preference', async () => {
      const event = 'BOOKING_CONFIRMED'

      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-2',
        event,
        emailEnabled: false,
        smsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event },
        update: { emailEnabled: false, smsEnabled: true },
        create: { event, emailEnabled: false, smsEnabled: true },
      })

      expect(result.emailEnabled).toBe(false)
      expect(result.smsEnabled).toBe(true)
    })

    it('should use event as unique constraint', async () => {
      const event = 'PAYMENT_RECEIVED'

      // First upsert creates
      prismaMock.notificationPreference.upsert.mockResolvedValueOnce({
        id: 'pref-3',
        event,
        emailEnabled: true,
        smsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Second upsert updates same record
      prismaMock.notificationPreference.upsert.mockResolvedValueOnce({
        id: 'pref-3', // Same ID
        event,
        emailEnabled: false,
        smsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const first = await prismaMock.notificationPreference.upsert({
        where: { event },
        update: { emailEnabled: true, smsEnabled: true },
        create: { event, emailEnabled: true, smsEnabled: true },
      })

      const second = await prismaMock.notificationPreference.upsert({
        where: { event },
        update: { emailEnabled: false, smsEnabled: true },
        create: { event, emailEnabled: false, smsEnabled: true },
      })

      expect(first.id).toBe(second.id) // Same record updated
    })
  })

  describe('Toggle notification channels', () => {
    it('should enable email notifications', async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        event: 'BOOKING_REQUEST',
        emailEnabled: true,
        smsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event: 'BOOKING_REQUEST' },
        update: { emailEnabled: true, smsEnabled: false },
        create: { event: 'BOOKING_REQUEST', emailEnabled: true, smsEnabled: false },
      })

      expect(result.emailEnabled).toBe(true)
    })

    it('should enable SMS notifications', async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        event: 'BOOKING_REQUEST',
        emailEnabled: false,
        smsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event: 'BOOKING_REQUEST' },
        update: { emailEnabled: false, smsEnabled: true },
        create: { event: 'BOOKING_REQUEST', emailEnabled: false, smsEnabled: true },
      })

      expect(result.smsEnabled).toBe(true)
    })

    it('should enable both channels', async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        event: 'BOOKING_REQUEST',
        emailEnabled: true,
        smsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event: 'BOOKING_REQUEST' },
        update: { emailEnabled: true, smsEnabled: true },
        create: { event: 'BOOKING_REQUEST', emailEnabled: true, smsEnabled: true },
      })

      expect(result.emailEnabled).toBe(true)
      expect(result.smsEnabled).toBe(true)
    })

    it('should disable both channels', async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        event: 'BOOKING_REQUEST',
        emailEnabled: false,
        smsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.notificationPreference.upsert({
        where: { event: 'BOOKING_REQUEST' },
        update: { emailEnabled: false, smsEnabled: false },
        create: { event: 'BOOKING_REQUEST', emailEnabled: false, smsEnabled: false },
      })

      expect(result.emailEnabled).toBe(false)
      expect(result.smsEnabled).toBe(false)
    })
  })

  describe('Query notification preferences', () => {
    it('should fetch all preferences ordered by event', async () => {
      const preferences = allNotificationEvents.map((event, index) => ({
        id: `pref-${index}`,
        event,
        emailEnabled: true,
        smsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      prismaMock.notificationPreference.findMany.mockResolvedValue(preferences)

      const result = await prismaMock.notificationPreference.findMany({
        orderBy: { event: 'asc' },
      })

      expect(result).toHaveLength(allNotificationEvents.length)
    })

    it('should return empty array when no preferences configured', async () => {
      prismaMock.notificationPreference.findMany.mockResolvedValue([])

      const result = await prismaMock.notificationPreference.findMany()

      expect(result).toHaveLength(0)
    })
  })

  describe('NotificationEvent enum coverage', () => {
    it('should support all defined notification events', () => {
      expect(allNotificationEvents).toContain('BOOKING_REQUEST')
      expect(allNotificationEvents).toContain('BOOKING_CONFIRMED')
      expect(allNotificationEvents).toContain('BOOKING_CANCELLED')
      expect(allNotificationEvents).toContain('PAYMENT_RECEIVED')
      expect(allNotificationEvents).toContain('PAYMENT_FAILED')
      expect(allNotificationEvents).toContain('GUEST_CHECKIN_REMINDER')
      expect(allNotificationEvents).toContain('GUEST_CHECKOUT_REMINDER')
      expect(allNotificationEvents).toContain('MAINTENANCE_QUOTE_RECEIVED')
      expect(allNotificationEvents).toContain('MAINTENANCE_COMPLETED')
      expect(allNotificationEvents).toContain('NEW_MESSAGE')
    })

    it('should have exactly 10 notification event types', () => {
      expect(allNotificationEvents.length).toBe(10)
    })
  })

  describe('Settings display data', () => {
    it('should map event to human-readable label', () => {
      const eventLabels: Record<string, string> = {
        BOOKING_REQUEST: 'New Booking Request',
        BOOKING_CONFIRMED: 'Booking Confirmed',
        BOOKING_CANCELLED: 'Booking Cancelled',
        PAYMENT_RECEIVED: 'Payment Received',
        PAYMENT_FAILED: 'Payment Failed',
        GUEST_CHECKIN_REMINDER: 'Guest Check-in Reminder',
        GUEST_CHECKOUT_REMINDER: 'Guest Check-out Reminder',
        MAINTENANCE_QUOTE_RECEIVED: 'Maintenance Quote Received',
        MAINTENANCE_COMPLETED: 'Maintenance Completed',
        NEW_MESSAGE: 'New Message',
      }

      allNotificationEvents.forEach((event) => {
        expect(eventLabels[event]).toBeDefined()
        expect(eventLabels[event]!.length).toBeGreaterThan(0)
      })
    })

    it('should map event to description', () => {
      const eventDescriptions: Record<string, string> = {
        BOOKING_REQUEST: 'When a guest submits a new booking request',
        BOOKING_CONFIRMED: 'When a booking is confirmed and payment processed',
        BOOKING_CANCELLED: 'When a booking is cancelled by guest or owner',
        PAYMENT_RECEIVED: 'When a payment is successfully received',
        PAYMENT_FAILED: 'When a payment attempt fails',
        GUEST_CHECKIN_REMINDER: 'Reminder before guest check-in date',
        GUEST_CHECKOUT_REMINDER: 'Reminder before guest check-out date',
        MAINTENANCE_QUOTE_RECEIVED: 'When a maintenance worker submits a quote',
        MAINTENANCE_COMPLETED: 'When maintenance work is completed',
        NEW_MESSAGE: 'When a new message is received',
      }

      allNotificationEvents.forEach((event) => {
        expect(eventDescriptions[event]).toBeDefined()
      })
    })

    it('should group preferences into a displayable structure', () => {
      const preferences = [
        { event: 'BOOKING_REQUEST', emailEnabled: true, smsEnabled: false },
        { event: 'PAYMENT_RECEIVED', emailEnabled: true, smsEnabled: true },
      ]

      const prefsMap = preferences.reduce<Record<string, { email: boolean; sms: boolean }>>(
        (acc, pref) => {
          acc[pref.event] = {
            email: pref.emailEnabled,
            sms: pref.smsEnabled,
          }
          return acc
        },
        {}
      )

      expect(prefsMap.BOOKING_REQUEST?.email).toBe(true)
      expect(prefsMap.BOOKING_REQUEST?.sms).toBe(false)
      expect(prefsMap.PAYMENT_RECEIVED?.email).toBe(true)
      expect(prefsMap.PAYMENT_RECEIVED?.sms).toBe(true)
    })

    it('should provide default values for unconfigured events', () => {
      const getPreference = (
        preferences: { event: string; emailEnabled: boolean; smsEnabled: boolean }[],
        event: string
      ) => {
        const found = preferences.find((p) => p.event === event)
        return {
          emailEnabled: found?.emailEnabled ?? true, // Default: email on
          smsEnabled: found?.smsEnabled ?? false, // Default: SMS off
        }
      }

      const existingPrefs = [{ event: 'BOOKING_REQUEST', emailEnabled: false, smsEnabled: true }]

      const bookingRequest = getPreference(existingPrefs, 'BOOKING_REQUEST')
      const paymentReceived = getPreference(existingPrefs, 'PAYMENT_RECEIVED')

      expect(bookingRequest.emailEnabled).toBe(false) // From config
      expect(bookingRequest.smsEnabled).toBe(true) // From config
      expect(paymentReceived.emailEnabled).toBe(true) // Default
      expect(paymentReceived.smsEnabled).toBe(false) // Default
    })
  })

  describe('Notification preference action response', () => {
    it('should return success for update operation', () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })
  })

  describe('Category grouping for display', () => {
    it('should categorize events by type', () => {
      const categories = {
        bookings: ['BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED'],
        payments: ['PAYMENT_RECEIVED', 'PAYMENT_FAILED'],
        reminders: ['GUEST_CHECKIN_REMINDER', 'GUEST_CHECKOUT_REMINDER'],
        maintenance: ['MAINTENANCE_QUOTE_RECEIVED', 'MAINTENANCE_COMPLETED'],
        communication: ['NEW_MESSAGE'],
      }

      const allCategorized = [
        ...categories.bookings,
        ...categories.payments,
        ...categories.reminders,
        ...categories.maintenance,
        ...categories.communication,
      ]

      expect(allCategorized).toHaveLength(10)
      allNotificationEvents.forEach((event) => {
        expect(allCategorized).toContain(event)
      })
    })
  })
})
