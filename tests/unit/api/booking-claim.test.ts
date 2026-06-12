import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../../__mocks__/prisma'
import { createHoldBookingFixture } from '../../fixtures/booking.factory'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

// Real token lib with a mocked secret — the route and the tests sign/verify
// with the same key, so token integrity is exercised end to end.
vi.mock('@/lib/env', () => ({
  env: () => ({ AUTH_SECRET: 'test-secret-at-least-32-characters-long' }),
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

const mockInvalidateBookings = vi.hoisted(() => vi.fn())

vi.mock('@/lib/cache/invalidation', () => ({
  invalidateBookings: mockInvalidateBookings,
}))

const { signPaymentClaimToken } = await import('@/lib/payment-claim-token')
const { POST } = await import('@/app/api/booking/[id]/claim/route')

const BOOKING_ID = 'booking-claim-1'
const GUEST_EMAIL = 'pat@example.com'

const createRequest = (body: unknown) =>
  new Request(`http://localhost/api/booking/${BOOKING_ID}/claim`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as never

const callRoute = (body: unknown, id = BOOKING_ID) =>
  POST(createRequest(body), { params: Promise.resolve({ id }) })

const liveHold = () =>
  createHoldBookingFixture({
    id: BOOKING_ID,
    guestEmail: GUEST_EMAIL,
    paymentClaimedAt: null,
  })

describe('POST /api/booking/[id]/claim', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 60_000,
    })
    prismaMock.booking.findUnique.mockResolvedValue(liveHold())
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 })
  })

  it('records the claim with a guarded atomic write', async () => {
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: {
        id: BOOKING_ID,
        status: 'PENDING',
        holdExpiresAt: { gt: expect.any(Date) },
      },
      data: { paymentClaimedAt: expect.any(Date) },
    })
    expect(mockInvalidateBookings).toHaveBeenCalled()
  })

  it('returns 401 for an invalid token', async () => {
    const response = await callRoute({ token: 'not-a-real-token' })

    expect(response.status).toBe(401)
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
  })

  it('returns 403 when the token was issued for a different booking', async () => {
    const token = await signPaymentClaimToken({
      bookingId: 'booking-other',
      guestEmail: GUEST_EMAIL,
    })

    const response = await callRoute({ token })

    expect(response.status).toBe(403)
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
  })

  it('returns 403 when the booking guest email no longer matches the token', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      createHoldBookingFixture({ id: BOOKING_ID, guestEmail: 'someone-else@example.com' })
    )
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })

    expect(response.status).toBe(403)
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
  })

  it('returns 404 when the booking does not exist', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null)
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })

    expect(response.status).toBe(404)
  })

  it('is idempotent — already-claimed holds return success without writing', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      createHoldBookingFixture({
        id: BOOKING_ID,
        guestEmail: GUEST_EMAIL,
        paymentClaimedAt: new Date(),
      })
    )
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, alreadyClaimed: true })
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
  })

  it('returns 409 when the guarded write matches nothing (expired or not pending)', async () => {
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 })
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })

    expect(response.status).toBe(409)
    expect(mockInvalidateBookings).not.toHaveBeenCalled()
  })

  it('returns 400 when the token is missing from the body', async () => {
    const response = await callRoute({})

    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    })
    const token = await signPaymentClaimToken({ bookingId: BOOKING_ID, guestEmail: GUEST_EMAIL })

    const response = await callRoute({ token })

    expect(response.status).toBe(429)
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
  })
})
