import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { env as mockEnv } from '../__mocks__/env'
import { prismaMock } from '../__mocks__/prisma'

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

const { GET } = await import('@/app/api/cron/reminders/route')

function createCronRequest(): Request {
  return new Request('http://localhost/api/cron/reminders', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret-1234567890' },
  })
}

const makeBooking = (id: string, email: string, checkIn: Date, checkOut: Date) => ({
  id,
  guestId: `guest-${id}`,
  checkIn,
  checkOut,
  guestName: `Guest ${id}`,
  guestEmail: email,
  guestPhone: null,
  basePrice: 450 as never,
  addonsTotal: 0 as never,
  depositAmount: 90 as never,
  totalAmount: 450 as never,
  paymentIntentId: `pi_${id}`,
  status: 'CONFIRMED' as const,
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
  cleaningStatus: 'NOT_REQUIRED' as const,
})

describe('cron reminders dedup behavior', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()
    mockSendCheckinReminder.mockResolvedValue(undefined)
    mockSendCheckoutReminder.mockResolvedValue(undefined)
    mockSendGalleryUploadInvite.mockResolvedValue(undefined)
  })

  describe('gallery invite dedup', () => {
    it('should NOT send gallery invite to already-notified recipients', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Check-in/out bookings empty
      prismaMock.booking.findMany
        .mockResolvedValueOnce([]) // checkin bookings
        .mockResolvedValueOnce([]) // checkout bookings
        .mockResolvedValueOnce([
          // completed bookings (yesterday checkout)
          makeBooking(
            'b1',
            'already-sent@test.com',
            new Date('2026-07-01'),
            new Date('2026-07-05')
          ),
          makeBooking('b2', 'new-guest@test.com', new Date('2026-07-02'), new Date('2026-07-06')),
        ] as never)

      // Batch dedup: gallery invite already sent to first guest
      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([]) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([]) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([{ recipient: 'already-sent@test.com' }] as never) // GALLERY_INVITE

      const response = await GET(createCronRequest())
      const json = await response.json()

      // Should only send to the new guest
      expect(mockSendGalleryUploadInvite).toHaveBeenCalledTimes(1)
      expect(mockSendGalleryUploadInvite).toHaveBeenCalledWith(
        expect.objectContaining({ guestEmail: 'new-guest@test.com' })
      )
      expect(json.galleryInvites.sent).toBe(1)
    })

    it('should send gallery invite to all recipients when none are pre-sent', async () => {
      prismaMock.booking.findMany
        .mockResolvedValueOnce([]) // checkin
        .mockResolvedValueOnce([]) // checkout
        .mockResolvedValueOnce([
          makeBooking('b1', 'guest-a@test.com', new Date('2026-07-01'), new Date('2026-07-05')),
          makeBooking('b2', 'guest-b@test.com', new Date('2026-07-02'), new Date('2026-07-06')),
        ] as never)

      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([]) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([]) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([]) // GALLERY_INVITE - none sent

      const response = await GET(createCronRequest())
      const json = await response.json()

      expect(mockSendGalleryUploadInvite).toHaveBeenCalledTimes(2)
      expect(json.galleryInvites.sent).toBe(2)
    })
  })

  describe('check-in reminder dedup', () => {
    it('should NOT send check-in reminder to already-notified recipients', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      prismaMock.booking.findMany
        .mockResolvedValueOnce([
          makeBooking('b1', 'sent@test.com', tomorrow, new Date('2026-07-10')),
          makeBooking('b2', 'unsent@test.com', tomorrow, new Date('2026-07-11')),
        ] as never) // checkin bookings
        .mockResolvedValueOnce([]) // checkout bookings
        .mockResolvedValueOnce([]) // completed bookings

      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([{ recipient: 'sent@test.com' }] as never) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([]) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([]) // GALLERY_INVITE

      const response = await GET(createCronRequest())
      const json = await response.json()

      expect(mockSendCheckinReminder).toHaveBeenCalledTimes(1)
      expect(mockSendCheckinReminder).toHaveBeenCalledWith(
        expect.objectContaining({ guestEmail: 'unsent@test.com' })
      )
      expect(json.checkinReminders.sent).toBe(1)
    })
  })

  describe('check-out reminder dedup', () => {
    it('should NOT send check-out reminder to already-notified recipients', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      prismaMock.booking.findMany
        .mockResolvedValueOnce([]) // checkin bookings
        .mockResolvedValueOnce([
          makeBooking('b1', 'sent@test.com', new Date('2026-07-01'), tomorrow),
          makeBooking('b2', 'unsent@test.com', new Date('2026-07-02'), tomorrow),
          makeBooking('b3', 'also-sent@test.com', new Date('2026-07-03'), tomorrow),
        ] as never) // checkout bookings
        .mockResolvedValueOnce([]) // completed bookings

      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([]) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([
          { recipient: 'sent@test.com' },
          { recipient: 'also-sent@test.com' },
        ] as never) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([]) // GALLERY_INVITE

      const response = await GET(createCronRequest())
      const json = await response.json()

      expect(mockSendCheckoutReminder).toHaveBeenCalledTimes(1)
      expect(mockSendCheckoutReminder).toHaveBeenCalledWith(
        expect.objectContaining({ guestEmail: 'unsent@test.com' })
      )
      expect(json.checkoutReminders.sent).toBe(1)
    })
  })

  describe('batch verification', () => {
    it('should use batch findMany for dedup, NOT per-booking findFirst', async () => {
      prismaMock.booking.findMany
        .mockResolvedValueOnce([
          makeBooking('b1', 'a@test.com', new Date(), new Date()),
          makeBooking('b2', 'b@test.com', new Date(), new Date()),
        ] as never) // checkin
        .mockResolvedValueOnce([makeBooking('b3', 'c@test.com', new Date(), new Date())] as never) // checkout
        .mockResolvedValueOnce([]) // completed

      prismaMock.notificationLog.findMany
        .mockResolvedValueOnce([]) // GUEST_CHECKIN_REMINDER
        .mockResolvedValueOnce([]) // GUEST_CHECKOUT_REMINDER
        .mockResolvedValueOnce([]) // GALLERY_INVITE

      await GET(createCronRequest())

      // Batch: exactly 3 findMany calls for dedup (one per event type)
      expect(prismaMock.notificationLog.findMany).toHaveBeenCalledTimes(3)
      expect(prismaMock.notificationLog.findMany).toHaveBeenCalledWith({
        where: { event: 'GUEST_CHECKIN_REMINDER' },
        select: { recipient: true },
      })
      expect(prismaMock.notificationLog.findMany).toHaveBeenCalledWith({
        where: { event: 'GUEST_CHECKOUT_REMINDER' },
        select: { recipient: true },
      })
      expect(prismaMock.notificationLog.findMany).toHaveBeenCalledWith({
        where: { event: 'GALLERY_INVITE' },
        select: { recipient: true },
      })

      // Must NOT use per-booking findFirst (N+1 anti-pattern)
      expect(prismaMock.notificationLog.findFirst).not.toHaveBeenCalled()
    })
  })
})
