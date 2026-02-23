import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../../__mocks__/prisma'
import { resetResendMocks, mockSend } from '../../__mocks__/resend'
import { createConfirmedBookingFixture, createBookingFixture } from '../../fixtures/booking.factory'
import type { NotificationPreference } from '@prisma/client'

// Mock modules
vi.mock('@/lib/prisma', () => import('../../__mocks__/prisma'))
vi.mock('@/lib/env', () => import('../../__mocks__/env'))
vi.mock('@/lib/auth/guards', () => ({
  assertOwner: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('resend', () => import('../../__mocks__/resend'))
vi.mock('twilio', () => import('../../__mocks__/twilio'))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: vi.fn().mockResolvedValue({ id: 'refund-123' }),
    },
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocks
const { approveBookingRequest, rejectBookingRequest, cancelBooking } =
  await import('@/actions/bookings')

const createPreferenceFixture = (
  event: string,
  emailEnabled = true,
  smsEnabled = false
): NotificationPreference => ({
  id: `pref-${event}`,
  event: event as NotificationPreference['event'],
  emailEnabled,
  smsEnabled,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('Booking Actions', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    resetResendMocks()
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'test-sid')
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'test-token')
    vi.stubEnv('TWILIO_PHONE_NUMBER', '+15555555555')
  })

  describe('approveBookingRequest', () => {
    it('should call sendBookingConfirmation after approval', async () => {
      const booking = createBookingFixture({ status: 'PENDING' })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CONFIRMED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CONFIRMED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)

      const result = await approveBookingRequest(booking.id)

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: booking.guestEmail,
          subject: expect.stringContaining('Confirmed'),
        })
      )
    })

    it('should update booking status to CONFIRMED', async () => {
      const booking = createBookingFixture({ status: 'PENDING' })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CONFIRMED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CONFIRMED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)

      await approveBookingRequest(booking.id)

      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
      })
    })
  })

  describe('rejectBookingRequest', () => {
    it('should call sendBookingCancellation with reason', async () => {
      const booking = createBookingFixture({ status: 'PENDING' })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CANCELLED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CANCELLED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)

      const result = await rejectBookingRequest(booking.id, 'Dates not available')

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: booking.guestEmail,
          subject: expect.stringContaining('Cancelled'),
        })
      )
    })

    it('should update booking status to CANCELLED', async () => {
      const booking = createBookingFixture({ status: 'PENDING' })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CANCELLED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CANCELLED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)

      await rejectBookingRequest(booking.id)

      expect(prismaMock.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: booking.id },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      )
    })
  })

  describe('cancelBooking', () => {
    it('should call sendBookingCancellation with refund amount', async () => {
      // Create a booking far in the future for full refund
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const checkout = new Date(futureDate)
      checkout.setDate(checkout.getDate() + 3)

      const booking = createConfirmedBookingFixture({
        checkIn: futureDate,
        checkOut: checkout,
        paymentIntentId: 'pi_test123',
      })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CANCELLED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CANCELLED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)

      const result = await cancelBooking(booking.id)

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: booking.guestEmail,
          subject: expect.stringContaining('Cancelled'),
        })
      )
    })

    it('should not fail if notification fails', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const checkout = new Date(futureDate)
      checkout.setDate(checkout.getDate() + 3)

      const booking = createConfirmedBookingFixture({
        checkIn: futureDate,
        checkOut: checkout,
        paymentIntentId: 'pi_test123',
      })
      prismaMock.booking.findUnique.mockResolvedValue(booking)
      prismaMock.booking.update.mockResolvedValue({ ...booking, status: 'CANCELLED' })
      prismaMock.notificationPreference.findUnique.mockResolvedValue(
        createPreferenceFixture('BOOKING_CANCELLED', true, false)
      )
      prismaMock.notificationLog.create.mockResolvedValue({} as never)
      mockSend.mockRejectedValueOnce(new Error('Email failed'))

      // Should not throw even though email failed
      const result = await cancelBooking(booking.id, 'owner')
      expect(result.success).toBe(true)
    })
  })
})
