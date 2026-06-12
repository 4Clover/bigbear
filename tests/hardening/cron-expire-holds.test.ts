import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { env as mockEnv } from '../__mocks__/env'
import { prismaMock } from '../__mocks__/prisma'
import { createHoldBookingFixture } from '../fixtures/booking.factory'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

const mockSendHoldExpired = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications-booking', () => ({
  sendHoldExpired: mockSendHoldExpired,
}))

const mockInvalidateBookings = vi.hoisted(() => vi.fn())
const mockInvalidateCalendar = vi.hoisted(() => vi.fn())

vi.mock('@/lib/cache/invalidation', () => ({
  invalidateBookings: mockInvalidateBookings,
  invalidateCalendar: mockInvalidateCalendar,
}))

vi.mock('@/lib/api/route-gates', () => ({
  cronRoute: (handler: (req: Request) => Promise<Response>) => handler,
  authenticatedRoute: vi.fn(),
  publicRoute: vi.fn(),
}))

const { GET } = await import('@/app/api/cron/expire-holds/route')

function createCronRequest(): Request {
  return new Request('http://localhost/api/cron/expire-holds', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret-1234567890' },
  })
}

const expiredHold = (id: string, email: string) =>
  createHoldBookingFixture({
    id,
    guestEmail: email,
    holdExpiresAt: new Date(Date.now() - 60 * 60 * 1000),
  })

describe('cron expire-holds', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()
    mockSendHoldExpired.mockResolvedValue(undefined)

    prismaMock.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === 'function') {
        return fn(prismaMock)
      }
      return Promise.all(fn)
    })
    prismaMock.booking.findMany.mockResolvedValue([])
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 })
  })

  it('cancels and emails expired unclaimed holds', async () => {
    const holds = [expiredHold('hold-1', 'a@test.com'), expiredHold('hold-2', 'b@test.com')]
    prismaMock.booking.findMany.mockResolvedValue(holds)
    prismaMock.booking.updateMany.mockResolvedValue({ count: 2 })

    const response = await GET(createCronRequest() as never)
    const json = await response.json()

    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['hold-1', 'hold-2'] } },
      data: expect.objectContaining({ status: 'CANCELLED' }),
    })
    expect(mockSendHoldExpired).toHaveBeenCalledTimes(2)
    expect(json).toEqual({ found: 2, cancelled: 2, sent: 2 })
    expect(mockInvalidateBookings).toHaveBeenCalled()
    expect(mockInvalidateCalendar).toHaveBeenCalled()
  })

  it('only targets PENDING, expired, unclaimed holds — claimed holds are exempt', async () => {
    await GET(createCronRequest() as never)

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        holdExpiresAt: { lt: expect.any(Date) },
        paymentClaimedAt: null,
      },
    })
  })

  it('reports send failures in the errors array without blocking other sends', async () => {
    const holds = [expiredHold('hold-1', 'a@test.com'), expiredHold('hold-2', 'b@test.com')]
    prismaMock.booking.findMany.mockResolvedValue(holds)
    prismaMock.booking.updateMany.mockResolvedValue({ count: 2 })
    mockSendHoldExpired
      .mockRejectedValueOnce(new Error('resend down'))
      .mockResolvedValueOnce(undefined)

    const response = await GET(createCronRequest() as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.found).toBe(2)
    expect(json.cancelled).toBe(2)
    expect(json.sent).toBe(1)
    expect(json.errors).toHaveLength(1)
    expect(json.errors[0]).toContain('hold-1')
  })

  it('does nothing when no holds are expired', async () => {
    const response = await GET(createCronRequest() as never)
    const json = await response.json()

    expect(json).toEqual({ found: 0, cancelled: 0, sent: 0 })
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled()
    expect(mockSendHoldExpired).not.toHaveBeenCalled()
    expect(mockInvalidateBookings).not.toHaveBeenCalled()
    expect(mockInvalidateCalendar).not.toHaveBeenCalled()
  })

  it('runs the sweep inside a transaction', async () => {
    prismaMock.booking.findMany.mockResolvedValue([expiredHold('hold-1', 'a@test.com')])
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 })

    await GET(createCronRequest() as never)

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })
})
