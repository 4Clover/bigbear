import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { env as mockEnv } from '../__mocks__/env'
import { prismaMock } from '../__mocks__/prisma'

// ─── Shared mocks ────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

// ─── Webhook-specific mocks ─────────────────────────────────

const mockHeaders = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockRefundCreate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    refunds: {
      create: mockRefundCreate,
    },
  },
}))

const mockSendBookingConfirmation = vi.hoisted(() => vi.fn())
const mockSendPaymentReceived = vi.hoisted(() => vi.fn())
const mockSendPaymentFailed = vi.hoisted(() => vi.fn())
const mockSendBookingFailedRefund = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications', () => ({
  sendBookingConfirmation: mockSendBookingConfirmation,
  sendPaymentReceived: mockSendPaymentReceived,
  sendPaymentFailed: mockSendPaymentFailed,
  sendBookingFailedRefund: mockSendBookingFailedRefund,
  sendCheckinReminder: vi.fn().mockResolvedValue(undefined),
  sendCheckoutReminder: vi.fn().mockResolvedValue(undefined),
  sendGalleryUploadInvite: vi.fn().mockResolvedValue(undefined),
}))

const mockIsDateRangeAvailable = vi.hoisted(() => vi.fn())

vi.mock('@/lib/utils/calendar', () => ({
  isDateRangeAvailable: mockIsDateRangeAvailable,
  formatICalDate: vi.fn((d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')),
}))

vi.mock('@/lib/security', () => ({
  validateExternalUrl: vi.fn().mockReturnValue(true),
}))

vi.mock('node-ical', () => ({
  default: {
    async: {
      parseICS: vi.fn().mockResolvedValue({
        'evt-1': { type: 'VEVENT', start: '2026-08-01', end: '2026-08-03' },
        'evt-2': { type: 'VEVENT', start: '2026-08-05', end: '2026-08-07' },
        'evt-3': { type: 'VEVENT', start: '2026-08-10', end: '2026-08-12' },
      }),
    },
  },
}))

vi.mock('@/lib/api/route-gates', () => ({
  cronRoute: (handler: (req: Request) => Promise<Response>) => handler,
  authenticatedRoute: vi.fn(),
  publicRoute: vi.fn(),
}))

const { POST: webhookPOST } = await import('@/app/api/stripe/webhook/route')
const { GET: remindersGET } = await import('@/app/api/cron/reminders/route')
const { GET: calendarSyncGET } = await import('@/app/api/cron/calendar-sync/route')
const { GET: icalGET } = await import('@/app/api/calendar/ical/route')

const stripeEventMock = (prismaMock as any).stripeEvent

// ─── Helpers ────────────────────────────────────────────────

const createWebhookRequest = () =>
  new Request('http://localhost/api/stripe/webhook', { method: 'POST' }) as never

const createCronRequest = (path: string) =>
  new Request(`http://localhost${path}`, {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret-1234567890' },
  }) as never

const createCheckoutEvent = (addonsJson: string) => ({
  id: 'evt_regression_test',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_regression_test',
      payment_intent: 'pi_regression_test',
      amount_total: 62500,
      metadata: {
        guestEmail: 'guest@test.com',
        guestName: 'Regression Guest',
        guestPhone: '555-1000',
        checkIn: '2026-07-10',
        checkOut: '2026-07-12',
        basePrice: '500',
        addonsTotal: '25',
        depositAmount: '100',
        totalAmount: '525',
        addons: addonsJson,
      },
    },
  },
})

const setupWebhookTransactionMocks = () => {
  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      return fn(prismaMock)
    }
    return Promise.all(fn)
  })

  prismaMock.booking.findUnique.mockResolvedValue(null)
  prismaMock.booking.findMany.mockResolvedValue([])
  prismaMock.blockedDate.findMany.mockResolvedValue([])
  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({
    id: 'guest-user-1',
    email: 'guest@test.com',
    name: 'Regression Guest',
    phone: '555-1000',
    role: 'GUEST',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  prismaMock.booking.create.mockResolvedValue({
    id: 'booking-regression-1',
    guestId: 'guest-user-1',
    checkIn: new Date('2026-07-10'),
    checkOut: new Date('2026-07-12'),
    guestName: 'Regression Guest',
    guestEmail: 'guest@test.com',
    guestPhone: '555-1000',
    basePrice: 500 as never,
    addonsTotal: 25 as never,
    depositAmount: 100 as never,
    totalAmount: 525 as never,
    paymentIntentId: 'pi_regression_test',
    status: 'CONFIRMED',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    approvedBy: null,
    cancellationReason: null,
    cancellationDetails: null,
    cancelledAt: null,
    rejectionReason: null,
    refundAmount: null,
    refundedAt: null,
    cleaningStatus: 'NOT_REQUIRED',
  } as never)
  prismaMock.addon.findMany.mockResolvedValue([])
  prismaMock.expenseCategory.findFirst.mockResolvedValue({ id: 'income-cat-1' } as never)
  prismaMock.transaction.create.mockResolvedValue({
    id: 'txn-regression-1',
    type: 'INCOME',
    categoryId: 'income-cat-1',
    amount: 525 as never,
    date: new Date(),
    description: 'Booking #ion-1',
    vendor: null,
    bookingId: 'booking-regression-1',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

// ─── Tests ──────────────────────────────────────────────────

describe('N+1 query regression tests', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()
    mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }))
    mockIsDateRangeAvailable.mockReturnValue(true)
    mockSendBookingConfirmation.mockResolvedValue(undefined)
    mockSendPaymentReceived.mockResolvedValue(undefined)
    mockSendPaymentFailed.mockResolvedValue(undefined)
    mockSendBookingFailedRefund.mockResolvedValue(undefined)
    mockRefundCreate.mockResolvedValue({ id: 're_1' })

    stripeEventMock.findUnique.mockResolvedValue(null)
    stripeEventMock.upsert.mockResolvedValue({
      id: 'evt_regression_test',
      type: 'checkout.session.completed',
      status: 'processing',
      createdAt: new Date(),
      processedAt: null,
    } as never)
    stripeEventMock.update.mockResolvedValue({
      id: 'evt_regression_test',
      type: 'checkout.session.completed',
      status: 'processed',
      createdAt: new Date(),
      processedAt: new Date(),
    } as never)
  })

  describe('webhook addon lookup batching', () => {
    it('should call addon.findMany exactly ONCE for 3 addons, never findUnique', async () => {
      setupWebhookTransactionMocks()

      // 3 addons in checkout metadata
      const addonsJson = JSON.stringify([
        { id: 'addon-a', quantity: 1, price: 10 },
        { id: 'addon-b', quantity: 2, price: 15 },
        { id: 'addon-c', quantity: 1, price: 20 },
      ])

      prismaMock.addon.findMany.mockResolvedValue([
        {
          id: 'addon-a',
          name: 'Firewood',
          description: null,
          price: 10 as never,
          isActive: true,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'addon-b',
          name: 'Hot Tub',
          description: null,
          price: 15 as never,
          isActive: true,
          sortOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'addon-c',
          name: 'Late Checkout',
          description: null,
          price: 20 as never,
          isActive: true,
          sortOrder: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never)

      prismaMock.bookingAddon.create.mockResolvedValue({
        id: 'ba-1',
        bookingId: 'booking-regression-1',
        addonId: 'addon-a',
        quantity: 1,
        price: 10 as never,
      } as never)

      mockConstructEvent.mockReturnValue(createCheckoutEvent(addonsJson))

      const response = await webhookPOST(createWebhookRequest())
      expect(response.status).toBe(200)

      // Batch: exactly 1 findMany call (NOT 3 findUnique)
      expect(prismaMock.addon.findMany).toHaveBeenCalledTimes(1)
      expect(prismaMock.addon.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['addon-a', 'addon-b', 'addon-c'] } },
      })
      expect(prismaMock.addon.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('reminders dedup batching', () => {
    it('should use batch findMany for dedup, NOT per-booking findFirst', async () => {
      // Set up bookings
      prismaMock.booking.findMany
        .mockResolvedValueOnce([
          {
            id: 'b1',
            guestEmail: 'a@test.com',
            status: 'CONFIRMED',
          } as never,
        ]) // checkin
        .mockResolvedValueOnce([]) // checkout
        .mockResolvedValueOnce([]) // completed

      // Batch dedup queries
      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([]) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([]) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([]) // GALLERY_INVITE

      await remindersGET(createCronRequest('/api/cron/reminders'))

      // Verify batch: 3 findMany calls (one per event type)
      expect(prismaMock.notificationLog.findMany).toHaveBeenCalledTimes(3)

      // Must NOT use per-booking findFirst (old N+1 pattern)
      expect(prismaMock.notificationLog.findFirst).not.toHaveBeenCalled()
    })
  })

  describe('calendar-sync batching', () => {
    it('should use createMany for batch insert, NOT per-event upsert', async () => {
      // Mock a single active calendar sync
      prismaMock.calendarSync.findMany.mockResolvedValue([
        {
          id: 'sync-1',
          name: 'Airbnb',
          icalUrl: 'https://airbnb.com/calendar.ics',
          isActive: true,
          lastSynced: null,
          lastError: null,
          syncCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      // Mock fetch for external iCal URL
      const mockFetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('BEGIN:VCALENDAR\nEND:VCALENDAR'),
      })
      vi.stubGlobal('fetch', mockFetch)

      prismaMock.blockedDate.createMany.mockResolvedValue({ count: 3 })
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === 'function') {
          return fn(prismaMock)
        }
        return Promise.all(fn)
      })
      prismaMock.blockedDate.updateMany.mockResolvedValue({ count: 1 })
      prismaMock.calendarSync.update.mockResolvedValue({
        id: 'sync-1',
        name: 'Airbnb',
        icalUrl: 'https://airbnb.com/calendar.ics',
        isActive: true,
        lastSynced: new Date(),
        lastError: null,
        syncCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await calendarSyncGET(createCronRequest('/api/cron/calendar-sync'))

      // Batch: createMany called with skipDuplicates (NOT per-event upsert)
      expect(prismaMock.blockedDate.createMany).toHaveBeenCalledTimes(1)
      expect(prismaMock.blockedDate.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true })
      )

      // Must NOT use per-event upsert (old N+1 pattern)
      expect(prismaMock.blockedDate.upsert).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })
  })

  describe('iCal token and content behavior', () => {
    it('should return 200 with iCal content for valid token', async () => {
      prismaMock.booking.findMany.mockResolvedValue([])
      prismaMock.blockedDate.findMany.mockResolvedValue([])

      const response = await icalGET(
        new Request('http://localhost/api/calendar/ical?token=test-ical-secret-1234567890')
      )

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('BEGIN:VCALENDAR')
      expect(body).toContain('END:VCALENDAR')
    })

    it('should return 401 when token is missing', async () => {
      const response = await icalGET(new Request('http://localhost/api/calendar/ical'))

      expect(response.status).toBe(401)
    })

    it('should never expose blocked.reason in iCal output', async () => {
      prismaMock.booking.findMany.mockResolvedValue([])
      prismaMock.blockedDate.findMany.mockResolvedValue([
        {
          id: 'blocked-1',
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-05'),
          reason: 'Pipe burst - emergency repair needed',
          notes: null,
          source: 'manual',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await icalGET(
        new Request('http://localhost/api/calendar/ical?token=test-ical-secret-1234567890')
      )

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('SUMMARY:Blocked')
      expect(body).not.toContain('Pipe burst')
      expect(body).not.toContain('emergency repair')
      expect(body).not.toContain('Blocked -')
    })
  })
})
