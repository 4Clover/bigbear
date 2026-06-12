import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../../__mocks__/prisma'
import { env as mockEnv } from '../../__mocks__/env'
import { createHoldBookingFixture } from '../../fixtures/booking.factory'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

const mockCheckRateLimit = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIdentifier: vi.fn(() => 'test-client'),
  RATE_LIMITS: {
    checkout: { limit: 10, windowSeconds: 15 * 60 },
    contact: { limit: 5, windowSeconds: 15 * 60 },
  },
}))

const mockSendHoldCreatedGuest = vi.hoisted(() => vi.fn())
const mockSendHoldCreatedOwner = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications-booking', () => ({
  sendHoldCreatedGuest: mockSendHoldCreatedGuest,
  sendHoldCreatedOwner: mockSendHoldCreatedOwner,
}))

const mockInvalidateBookings = vi.hoisted(() => vi.fn())
const mockInvalidateCalendar = vi.hoisted(() => vi.fn())

vi.mock('@/lib/cache/invalidation', () => ({
  invalidateBookings: mockInvalidateBookings,
  invalidateCalendar: mockInvalidateCalendar,
}))

const { POST } = await import('@/app/api/booking/alt-payment/route')

const futureDate = (daysFromNow: number) => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

// 3 nights at $250 + $100 cleaning fee = $850 base; addon $50 → $900 total
const validBody = (overrides: Record<string, unknown> = {}) => ({
  checkIn: futureDate(30),
  checkOut: futureDate(33),
  guestName: 'Pat Guest',
  guestEmail: 'pat@example.com',
  guestPhone: '555-0100',
  addons: [],
  paymentMethod: 'VENMO',
  ...overrides,
})

const createRequest = (body: unknown) =>
  new Request('http://localhost/api/booking/alt-payment', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as never

const pricingFixture = {
  id: 'pricing-1',
  baseNightlyRate: 250,
  cleaningFee: 100,
  depositPercentage: 20,
  minNights: 2,
  maxNights: 14,
} as never

const guestUser = {
  id: 'user-guest-1',
  email: 'pat@example.com',
  name: 'Pat Guest',
  role: 'GUEST',
} as never

describe('POST /api/booking/alt-payment', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      resetTime: Date.now() + 60_000,
    })
    mockSendHoldCreatedGuest.mockResolvedValue(undefined)
    mockSendHoldCreatedOwner.mockResolvedValue(undefined)

    prismaMock.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === 'function') {
        return fn(prismaMock)
      }
      return Promise.all(fn)
    })

    prismaMock.pricingConfig.findFirst.mockResolvedValue(pricingFixture)
    prismaMock.addon.findMany.mockResolvedValue([])
    // Expired-hold sweep + availability check (both clear by default)
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.booking.findFirst.mockResolvedValue(null)
    prismaMock.blockedDate.findFirst.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(guestUser)
    prismaMock.booking.create.mockResolvedValue(
      createHoldBookingFixture({
        id: 'booking-hold-1',
        guestEmail: 'pat@example.com',
        guestName: 'Pat Guest',
      })
    )
  })

  describe('validation', () => {
    it('rejects STRIPE as a payment method', async () => {
      const response = await POST(createRequest(validBody({ paymentMethod: 'STRIPE' })))

      expect(response.status).toBe(400)
      expect(prismaMock.booking.create).not.toHaveBeenCalled()
    })

    it('rejects CONTACT_OWNER without a message', async () => {
      const response = await POST(createRequest(validBody({ paymentMethod: 'CONTACT_OWNER' })))
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'message' })])
      )
    })

    it('rejects a past check-in date', async () => {
      const response = await POST(createRequest(validBody({ checkIn: '2020-01-01' })))

      expect(response.status).toBe(400)
    })

    it('rejects stays shorter than minNights', async () => {
      const response = await POST(
        createRequest(validBody({ checkIn: futureDate(30), checkOut: futureDate(31) }))
      )
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('Minimum stay is 2 nights')
    })
  })

  describe('pricing', () => {
    it('computes amounts server-side from pricing config and DB addon prices', async () => {
      prismaMock.addon.findMany.mockResolvedValue([{ id: 'addon-1', price: 50 }] as never)

      const response = await POST(
        createRequest(validBody({ addons: [{ id: 'addon-1', quantity: 1 }] }))
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.amountDue).toBe(900)
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          basePrice: 850,
          addonsTotal: 50,
          totalAmount: 900,
          depositAmount: 180,
          status: 'PENDING',
          paymentMethod: 'VENMO',
          holdExpiresAt: expect.any(Date),
        }),
      })
    })

    it('ignores client-supplied amounts entirely', async () => {
      const response = await POST(
        createRequest(validBody({ totalAmount: 1, basePrice: 1, depositAmount: 0, addonsTotal: 0 }))
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.amountDue).toBe(850)
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ basePrice: 850, totalAmount: 850, depositAmount: 170 }),
      })
    })

    it('prices addons from the DB, not the client quantity times client price', async () => {
      prismaMock.addon.findMany.mockResolvedValue([{ id: 'addon-1', price: 50 }] as never)

      await POST(
        createRequest(
          validBody({
            addons: [
              { id: 'addon-1', quantity: 2 },
              { id: 'addon-ghost', quantity: 9 },
            ],
          })
        )
      )

      // 850 base + 50×2 = 950; unknown addon id contributes nothing
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ addonsTotal: 100, totalAmount: 950 }),
      })
      // BookingAddon rows only for addons that exist in the DB
      expect(prismaMock.bookingAddon.create).toHaveBeenCalledTimes(1)
      expect(prismaMock.bookingAddon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ addonId: 'addon-1', quantity: 2, price: 50 }),
      })
    })
  })

  describe('availability', () => {
    it('returns 409 when the dates are unavailable', async () => {
      prismaMock.booking.findFirst.mockResolvedValue({ id: 'conflict' } as never)

      const response = await POST(createRequest(validBody()))
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error).toContain('no longer available')
      expect(prismaMock.booking.create).not.toHaveBeenCalled()
    })

    it('returns 409 when the exclusion constraint rejects the insert', async () => {
      const overlapConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Raw query failed: booking_no_date_overlap',
        { code: 'P2010', clientVersion: '7.0.0' }
      )
      prismaMock.booking.create.mockRejectedValue(overlapConstraintError)

      const response = await POST(createRequest(validBody()))

      expect(response.status).toBe(409)
    })

    it('returns 409 when the constraint surfaces as a generic Error', async () => {
      prismaMock.booking.create.mockRejectedValue(
        new Error('conflicting key value violates exclusion constraint "booking_no_date_overlap"')
      )

      const response = await POST(createRequest(validBody()))

      expect(response.status).toBe(409)
    })

    it('sweeps expired overlapping holds inside the transaction', async () => {
      await POST(createRequest(validBody()))

      expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'PENDING',
          holdExpiresAt: { lt: expect.any(Date) },
        }),
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    })
  })

  describe('booking creation', () => {
    it('creates a PENDING hold and returns claim-free response payload', async () => {
      const response = await POST(createRequest(validBody()))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.bookingId).toBe('booking-hold-1')
      expect(typeof json.holdExpiresAt).toBe('string')
      expect(json.paymentMethod).toBe('VENMO')
      expect(json.methodInfo).toEqual({ name: 'Venmo', handle: '@GrizzlyGetaway' })
      // The claim token travels by email only — never in the API response
      expect(JSON.stringify(json)).not.toContain('token')
    })

    it('reuses an existing user instead of creating a duplicate', async () => {
      prismaMock.user.findUnique.mockResolvedValue(guestUser)

      await POST(createRequest(validBody()))

      expect(prismaMock.user.create).not.toHaveBeenCalled()
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ guestId: 'user-guest-1' }),
      })
    })

    it('creates a message row for CONTACT_OWNER holds', async () => {
      const response = await POST(
        createRequest(validBody({ paymentMethod: 'CONTACT_OWNER', message: 'Can I pay by check?' }))
      )

      expect(response.status).toBe(200)
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          senderId: 'user-guest-1',
          bookingId: 'booking-hold-1',
          content: 'Can I pay by check?',
        },
      })
    })

    it('does not create a message row for direct payment methods', async () => {
      await POST(createRequest(validBody({ message: 'stray message' })))

      expect(prismaMock.message.create).not.toHaveBeenCalled()
    })
  })

  describe('notifications and caching', () => {
    it('fires both hold notifications without blocking on failure', async () => {
      mockSendHoldCreatedGuest.mockRejectedValue(new Error('resend down'))
      mockSendHoldCreatedOwner.mockRejectedValue(new Error('resend down'))

      const response = await POST(createRequest(validBody()))

      expect(response.status).toBe(200)
      expect(mockSendHoldCreatedGuest).toHaveBeenCalledTimes(1)
      expect(mockSendHoldCreatedOwner).toHaveBeenCalledTimes(1)
    })

    it('invalidates booking and calendar caches on success', async () => {
      await POST(createRequest(validBody()))

      expect(mockInvalidateBookings).toHaveBeenCalled()
      expect(mockInvalidateCalendar).toHaveBeenCalled()
    })
  })

  describe('rate limiting', () => {
    it('returns 429 with rate-limit headers when over the limit', async () => {
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 60_000,
      })

      const response = await POST(createRequest(validBody()))

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(prismaMock.booking.create).not.toHaveBeenCalled()
    })
  })
})
