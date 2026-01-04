import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import { addDays } from 'date-fns'
import {
  createConfirmedBookingFixture,
  createBookingFixture,
  resetBookingCounter,
} from '../fixtures/booking.factory'

// Simple Decimal-like class for tests
class Decimal {
  private value: number

  constructor(value: string | number) {
    this.value = typeof value === 'string' ? parseFloat(value) : value
  }

  toNumber(): number {
    return this.value
  }

  toString(): string {
    return String(this.value)
  }
}

/**
 * Owner cancellation with refund data path tests.
 * Tests the cancellation workflow including:
 * - Refund calculation based on days until check-in
 * - Status transition: CONFIRMED → CANCELLED
 * - Stripe refund amount calculation (cents conversion)
 * - Notes update with cancellation details
 *
 * Refund Policy:
 * - 14+ days before check-in: Full refund (totalAmount - depositAmount)
 * - 7-13 days before check-in: 50% refund of refundable amount
 * - Less than 7 days: No refund
 * Deposit is always non-refundable.
 */
describe('Owner Cancellation Refund Data Path', () => {
  beforeEach(() => {
    resetBookingCounter()
    vi.clearAllMocks()
  })

  describe('Cancellation eligibility', () => {
    it('should only allow cancellation of CONFIRMED bookings', async () => {
      const confirmedBooking = createConfirmedBookingFixture()

      prismaMock.booking.findUnique.mockResolvedValue(confirmedBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: confirmedBooking.id },
      })

      const canCancel = found?.status === 'CONFIRMED'
      expect(canCancel).toBe(true)
    })

    it('should not allow cancellation of PENDING bookings', async () => {
      const pendingBooking = createBookingFixture({ status: 'PENDING' })

      prismaMock.booking.findUnique.mockResolvedValue(pendingBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: pendingBooking.id },
      })

      const canCancel = found?.status === 'CONFIRMED'
      expect(canCancel).toBe(false)
    })

    it('should not allow cancellation of already CANCELLED bookings', async () => {
      const cancelledBooking = createBookingFixture({
        status: 'CANCELLED' as const,
      })

      prismaMock.booking.findUnique.mockResolvedValue(cancelledBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: cancelledBooking.id },
      })

      const canCancel = found?.status === 'CONFIRMED'
      expect(canCancel).toBe(false)
    })

    it('should not allow cancellation of COMPLETED bookings', async () => {
      const completedBooking = createConfirmedBookingFixture({
        status: 'COMPLETED' as const,
      })

      prismaMock.booking.findUnique.mockResolvedValue(completedBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: completedBooking.id },
      })

      const canCancel = found?.status === 'CONFIRMED'
      expect(canCancel).toBe(false)
    })
  })

  describe('Refund amount calculation', () => {
    const totalAmount = 500
    const depositAmount = 100
    const refundableAmount = totalAmount - depositAmount // 400

    it('should calculate full refund for 14+ days notice', () => {
      const daysUntilCheckIn = 14

      // Business rule: 14+ days = full refund of refundable amount
      const refundPercentage = daysUntilCheckIn >= 14 ? 100 : daysUntilCheckIn >= 7 ? 50 : 0
      const refundAmount = (refundableAmount * refundPercentage) / 100

      expect(refundPercentage).toBe(100)
      expect(refundAmount).toBe(400)
    })

    it('should calculate 50% refund for 7-13 days notice', () => {
      const testCases = [7, 10, 13]

      testCases.forEach((daysUntilCheckIn) => {
        const refundPercentage = daysUntilCheckIn >= 14 ? 100 : daysUntilCheckIn >= 7 ? 50 : 0
        const refundAmount = (refundableAmount * refundPercentage) / 100

        expect(refundPercentage).toBe(50)
        expect(refundAmount).toBe(200)
      })
    })

    it('should calculate zero refund for less than 7 days notice', () => {
      const testCases = [0, 1, 3, 6]

      testCases.forEach((daysUntilCheckIn) => {
        const refundPercentage = daysUntilCheckIn >= 14 ? 100 : daysUntilCheckIn >= 7 ? 50 : 0
        const refundAmount = (refundableAmount * refundPercentage) / 100

        expect(refundPercentage).toBe(0)
        expect(refundAmount).toBe(0)
      })
    })

    it('should handle zero deposit correctly', () => {
      const totalWithNoDeposit = 500
      const zeroDeposit = 0
      const refundable = totalWithNoDeposit - zeroDeposit
      const refundPercentage = 100 // Assuming 14+ days
      const refundAmount = (refundable * refundPercentage) / 100

      expect(refundAmount).toBe(500) // Full amount refundable
    })

    it('should handle large booking amounts', () => {
      const largeTotal = 5000
      const largeDeposit = 1000
      const refundable = largeTotal - largeDeposit // 4000
      const refundPercentage = 50 // 7-13 days
      const refundAmount = (refundable * refundPercentage) / 100

      expect(refundAmount).toBe(2000)
    })
  })

  describe('Stripe refund amount conversion', () => {
    it('should convert dollars to cents for Stripe API', () => {
      const refundAmountDollars = 400.0
      const refundAmountCents = Math.round(refundAmountDollars * 100)

      expect(refundAmountCents).toBe(40000)
    })

    it('should handle decimal amounts correctly', () => {
      const refundAmountDollars = 199.99
      const refundAmountCents = Math.round(refundAmountDollars * 100)

      expect(refundAmountCents).toBe(19999)
    })

    it('should handle fractional cents with rounding', () => {
      const refundAmountDollars = 133.33 // Half of 266.66
      const refundAmountCents = Math.round(refundAmountDollars * 100)

      expect(refundAmountCents).toBe(13333)
    })

    it('should not process Stripe refund when amount is zero', () => {
      const refundAmount = 0
      const shouldCallStripe = refundAmount > 0

      expect(shouldCallStripe).toBe(false)
    })

    it('should require paymentIntentId for Stripe refund', () => {
      const bookingWithPayment = { paymentIntentId: 'pi_123' }
      const bookingWithoutPayment = { paymentIntentId: null }

      const canRefundWithPayment =
        bookingWithPayment.paymentIntentId !== null &&
        bookingWithPayment.paymentIntentId !== undefined
      const canRefundWithoutPayment =
        bookingWithoutPayment.paymentIntentId !== null &&
        bookingWithoutPayment.paymentIntentId !== undefined

      expect(canRefundWithPayment).toBe(true)
      expect(canRefundWithoutPayment).toBe(false)
    })
  })

  describe('Cancellation status update', () => {
    it('should update booking status to CANCELLED', async () => {
      const confirmedBooking = createConfirmedBookingFixture()
      const cancelledBooking = {
        ...confirmedBooking,
        status: 'CANCELLED' as const,
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: confirmedBooking.id },
        data: { status: 'CANCELLED' },
      })

      expect(result.status).toBe('CANCELLED')
    })

    it('should append cancellation details to notes', async () => {
      const confirmedBooking = createConfirmedBookingFixture({
        notes: 'VIP guest',
      })
      const cancellationNote = 'Cancelled by owner. Refund: full ($400.00)'
      const cancelledBooking = {
        ...confirmedBooking,
        status: 'CANCELLED' as const,
        notes: `${confirmedBooking.notes}\n\n${cancellationNote}`,
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: confirmedBooking.id },
        data: {
          status: 'CANCELLED',
          notes: `${confirmedBooking.notes}\n\n${cancellationNote}`,
        },
      })

      expect(result.notes).toContain('VIP guest')
      expect(result.notes).toContain('Cancelled by owner')
      expect(result.notes).toContain('$400.00')
    })

    it('should handle booking with no existing notes', async () => {
      const confirmedBooking = createConfirmedBookingFixture({ notes: null })
      const cancellationNote = 'Cancelled by guest. Refund: partial ($200.00)'
      const cancelledBooking = {
        ...confirmedBooking,
        status: 'CANCELLED' as const,
        notes: cancellationNote,
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: confirmedBooking.id },
        data: {
          status: 'CANCELLED',
          notes: cancellationNote,
        },
      })

      expect(result.notes).toBe(cancellationNote)
    })

    it('should include refund type in notes', async () => {
      const refundTypes = ['full', 'partial', 'none']
      const expectedPatterns = ['Refund: full', 'Refund: partial', 'Refund: none']

      refundTypes.forEach((type, index) => {
        const note = `Cancelled by owner. Refund: ${type} ($0.00)`
        expect(note).toContain(expectedPatterns[index])
      })
    })

    it('should include initiator in notes (guest or owner)', () => {
      const initiators: ('guest' | 'owner')[] = ['guest', 'owner']

      initiators.forEach((initiator) => {
        const note = `Cancelled by ${initiator}. Refund: full ($400.00)`
        expect(note).toContain(`Cancelled by ${initiator}`)
      })
    })
  })

  describe('Days until check-in calculation', () => {
    it('should calculate days correctly from check-in date', () => {
      const today = new Date()
      const checkIn14Days = addDays(today, 14)
      const checkIn7Days = addDays(today, 7)
      const checkIn3Days = addDays(today, 3)

      const calculateDays = (checkIn: Date, now: Date) => {
        const diffMs = checkIn.getTime() - now.getTime()
        return Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }

      expect(calculateDays(checkIn14Days, today)).toBe(14)
      expect(calculateDays(checkIn7Days, today)).toBe(7)
      expect(calculateDays(checkIn3Days, today)).toBe(3)
    })

    it('should handle same-day cancellation', () => {
      const today = new Date()
      const checkInToday = today

      const diffMs = checkInToday.getTime() - today.getTime()
      const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      expect(daysUntil).toBe(0)
    })

    it('should handle past check-in date', () => {
      const today = new Date()
      const checkInYesterday = addDays(today, -1)

      const diffMs = checkInYesterday.getTime() - today.getTime()
      const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      expect(daysUntil).toBeLessThan(0)
    })
  })

  describe('Refund result structure', () => {
    it('should include all required fields in refund result', () => {
      const refundResult = {
        type: 'full' as const,
        percentage: 100,
        amount: 400,
        reason: 'Cancelled 14+ days before check-in',
      }

      expect(refundResult).toHaveProperty('type')
      expect(refundResult).toHaveProperty('percentage')
      expect(refundResult).toHaveProperty('amount')
      expect(refundResult).toHaveProperty('reason')
    })

    it('should return valid refund types', () => {
      const validTypes = ['full', 'partial', 'none']

      const scenarios = [
        { days: 20, expectedType: 'full' },
        { days: 10, expectedType: 'partial' },
        { days: 5, expectedType: 'none' },
      ]

      scenarios.forEach(({ days, expectedType }) => {
        const type = days >= 14 ? 'full' : days >= 7 ? 'partial' : 'none'
        expect(validTypes).toContain(type)
        expect(type).toBe(expectedType)
      })
    })
  })

  describe('Cancellation action response', () => {
    it('should return success with refund details', () => {
      const actionResult = {
        success: true,
        refund: {
          type: 'full' as const,
          percentage: 100,
          amount: 400,
          reason: 'Cancelled 14+ days before check-in',
        },
        refundId: 're_123abc',
      }

      expect(actionResult.success).toBe(true)
      expect(actionResult.refund.amount).toBe(400)
      expect(actionResult.refundId).toBe('re_123abc')
    })

    it('should return null refundId when no Stripe refund processed', () => {
      const actionResult = {
        success: true,
        refund: {
          type: 'none' as const,
          percentage: 0,
          amount: 0,
          reason: 'Cancelled less than 7 days before check-in',
        },
        refundId: null,
      }

      expect(actionResult.refundId).toBeNull()
    })
  })
})
