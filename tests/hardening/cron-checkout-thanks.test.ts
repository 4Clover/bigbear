import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { env as mockEnv } from '../__mocks__/env'
import { prismaMock } from '../__mocks__/prisma'
import { createBookingFixture } from '../fixtures/booking.factory'
import type { Booking } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

const mockSendCheckinReminder = vi.hoisted(() => vi.fn())
const mockSendCheckoutReminder = vi.hoisted(() => vi.fn())
const mockSendGalleryUploadInvite = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications', () => ({
  sendCheckinReminder: mockSendCheckinReminder,
  sendCheckoutReminder: mockSendCheckoutReminder,
  sendGalleryUploadInvite: mockSendGalleryUploadInvite,
}))

const mockSendCheckoutThanks = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications-booking', () => ({
  sendCheckoutThanks: mockSendCheckoutThanks,
}))

vi.mock('@/lib/api/route-gates', () => ({
  cronRoute: (handler: (req: Request) => Promise<Response>) => handler,
  authenticatedRoute: vi.fn(),
  publicRoute: vi.fn(),
}))

const { GET } = await import('@/app/api/cron/reminders/route')

function createCronRequest(): Request {
  return new Request('http://localhost/api/cron/reminders', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret-1234567890' },
  })
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)

// The route fires booking.findMany in a fixed order: check-in reminders,
// check-out reminders, gallery completed, checkout-today thanks, retry sweep.
const primeFindMany = ({
  checkoutToday = [],
  retryCandidates = [],
}: {
  checkoutToday?: Booking[]
  retryCandidates?: Booking[]
} = {}) => {
  prismaMock.booking.findMany
    .mockResolvedValueOnce([]) // checkin reminders
    .mockResolvedValueOnce([]) // checkout reminders
    .mockResolvedValueOnce([]) // gallery completed
    .mockResolvedValueOnce(checkoutToday)
    .mockResolvedValueOnce(retryCandidates)
}

const checkoutTodayBooking = (id: string) =>
  createBookingFixture({
    id,
    status: 'COMPLETED',
    checkOut: new Date(),
    checkoutEmailSentAt: null,
    reviewInviteAttempts: 0,
    reviewInviteLastAttemptAt: null,
  })

const retryBooking = (id: string, attempts: number, lastAttempt: Date) =>
  createBookingFixture({
    id,
    status: 'COMPLETED',
    checkOut: hoursAgo(24 * 7),
    checkoutEmailSentAt: hoursAgo(24 * 7),
    reviewInviteAttempts: attempts,
    reviewInviteLastAttemptAt: lastAttempt,
  })

describe('cron checkout-thanks + review retry cadence', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()
    mockSendCheckinReminder.mockResolvedValue(undefined)
    mockSendCheckoutReminder.mockResolvedValue(undefined)
    mockSendGalleryUploadInvite.mockResolvedValue(undefined)
    mockSendCheckoutThanks.mockResolvedValue(true)
    prismaMock.notificationLog.findMany.mockResolvedValue([])
    prismaMock.booking.update.mockResolvedValue({} as never)
  })

  describe('checkout-day thanks', () => {
    it('sends the thanks email and stamps the dedup/retry columns', async () => {
      primeFindMany({ checkoutToday: [checkoutTodayBooking('b-today')] })

      const response = await GET(createCronRequest() as never)
      const json = await response.json()

      expect(mockSendCheckoutThanks).toHaveBeenCalledTimes(1)
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-today' },
        data: {
          checkoutEmailSentAt: expect.any(Date),
          reviewInviteAttempts: 1,
          reviewInviteLastAttemptAt: expect.any(Date),
        },
      })
      expect(json.checkoutThanks).toEqual({ found: 1, sent: 1 })
    })

    it('queries only unsent checkouts in the UTC day window', async () => {
      primeFindMany()

      await GET(createCronRequest() as never)

      expect(prismaMock.booking.findMany).toHaveBeenNthCalledWith(4, {
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          checkoutEmailSentAt: null,
          checkOut: { gte: expect.any(Date), lte: expect.any(Date) },
        },
      })
    })

    it('does not stamp columns when the send fails — next run retries', async () => {
      primeFindMany({ checkoutToday: [checkoutTodayBooking('b-fail')] })
      mockSendCheckoutThanks.mockResolvedValue(false)

      const response = await GET(createCronRequest() as never)
      const json = await response.json()

      expect(prismaMock.booking.update).not.toHaveBeenCalled()
      expect(json.checkoutThanks).toEqual({ found: 1, sent: 0 })
      expect(json.errors).toEqual(expect.arrayContaining([expect.stringContaining('b-fail')]))
    })
  })

  describe('review retry cadence', () => {
    it('excludes attempts=4 and reviewed bookings via the query filter', async () => {
      primeFindMany()

      await GET(createCronRequest() as never)

      expect(prismaMock.booking.findMany).toHaveBeenNthCalledWith(5, {
        where: {
          reviewInviteAttempts: { in: [1, 2, 3] },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          review: { is: null },
          reviewInviteLastAttemptAt: { not: null },
        },
      })
    })

    it('resends at attempts=1 when the last attempt was 25h ago', async () => {
      primeFindMany({ retryCandidates: [retryBooking('b-due', 1, hoursAgo(25))] })

      const response = await GET(createCronRequest() as never)
      const json = await response.json()

      expect(mockSendCheckoutThanks).toHaveBeenCalledTimes(1)
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-due' },
        data: {
          reviewInviteAttempts: 2,
          reviewInviteLastAttemptAt: expect.any(Date),
        },
      })
      expect(json.reviewRetries).toEqual({ found: 1, sent: 1 })
    })

    it('does NOT resend at attempts=1 when the last attempt was only 23h ago', async () => {
      primeFindMany({ retryCandidates: [retryBooking('b-early', 1, hoursAgo(23))] })

      const response = await GET(createCronRequest() as never)
      const json = await response.json()

      expect(mockSendCheckoutThanks).not.toHaveBeenCalled()
      expect(prismaMock.booking.update).not.toHaveBeenCalled()
      expect(json.reviewRetries).toEqual({ found: 1, sent: 0 })
    })

    it('waits 2 days after the second attempt', async () => {
      primeFindMany({
        retryCandidates: [
          retryBooking('b-2-due', 2, hoursAgo(49)),
          retryBooking('b-2-early', 2, hoursAgo(47)),
        ],
      })

      await GET(createCronRequest() as never)

      expect(mockSendCheckoutThanks).toHaveBeenCalledTimes(1)
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-2-due' },
        data: expect.objectContaining({ reviewInviteAttempts: 3 }),
      })
    })

    it('waits 4 days after the third attempt', async () => {
      primeFindMany({
        retryCandidates: [
          retryBooking('b-3-due', 3, hoursAgo(97)),
          retryBooking('b-3-early', 3, hoursAgo(95)),
        ],
      })

      await GET(createCronRequest() as never)

      expect(mockSendCheckoutThanks).toHaveBeenCalledTimes(1)
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-3-due' },
        data: expect.objectContaining({ reviewInviteAttempts: 4 }),
      })
    })

    it('does not increment attempts when the retry send fails', async () => {
      primeFindMany({ retryCandidates: [retryBooking('b-retry-fail', 1, hoursAgo(30))] })
      mockSendCheckoutThanks.mockResolvedValue(false)

      const response = await GET(createCronRequest() as never)
      const json = await response.json()

      expect(prismaMock.booking.update).not.toHaveBeenCalled()
      expect(json.reviewRetries).toEqual({ found: 1, sent: 0 })
      expect(json.errors).toEqual(expect.arrayContaining([expect.stringContaining('b-retry-fail')]))
    })
  })
})
