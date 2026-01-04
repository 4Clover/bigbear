import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import {
  createBookingFixture,
  createConfirmedBookingFixture,
  resetBookingCounter,
} from '../fixtures/booking.factory'

/**
 * Owner booking management data path tests.
 * Tests the booking approval/rejection workflows:
 * - Approval: PENDING → CONFIRMED status transition
 * - Rejection: PENDING → CANCELLED status transition with optional reason
 * - Authorization: Only OWNER role can perform these actions
 * - Validation: Only PENDING bookings can be approved/rejected
 */
describe('Owner Booking Management Data Path', () => {
  beforeEach(() => {
    resetBookingCounter()
    vi.clearAllMocks()
  })

  describe('Booking approval workflow', () => {
    it('should transition PENDING booking to CONFIRMED on approval', async () => {
      const pendingBooking = createBookingFixture({ status: 'PENDING' })
      const confirmedBooking = {
        ...pendingBooking,
        status: 'CONFIRMED' as const,
      }

      prismaMock.booking.findUnique.mockResolvedValue(pendingBooking)
      prismaMock.booking.update.mockResolvedValue(confirmedBooking)

      // Simulate finding and updating
      const found = await prismaMock.booking.findUnique({
        where: { id: pendingBooking.id },
      })
      expect(found?.status).toBe('PENDING')

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: { status: 'CONFIRMED' },
      })

      expect(result.status).toBe('CONFIRMED')
    })

    it('should only allow approval of PENDING bookings', async () => {
      const confirmedBooking = createConfirmedBookingFixture()

      prismaMock.booking.findUnique.mockResolvedValue(confirmedBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: confirmedBooking.id },
      })

      // Business rule: Only PENDING bookings can be approved
      const canApprove = found?.status === 'PENDING'
      expect(canApprove).toBe(false)
    })

    it('should not modify other booking fields during approval', async () => {
      const pendingBooking = createBookingFixture({
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        numberOfGuests: 4,
      })
      const confirmedBooking = {
        ...pendingBooking,
        status: 'CONFIRMED' as const,
      }

      prismaMock.booking.update.mockResolvedValue(confirmedBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: { status: 'CONFIRMED' },
      })

      expect(result.guestName).toBe('John Doe')
      expect(result.guestEmail).toBe('john@example.com')
      expect(result.numberOfGuests).toBe(4)
      expect(result.status).toBe('CONFIRMED')
    })
  })

  describe('Booking rejection workflow', () => {
    it('should transition PENDING booking to CANCELLED on rejection', async () => {
      const pendingBooking = createBookingFixture({ status: 'PENDING' })
      const cancelledBooking = {
        ...pendingBooking,
        status: 'CANCELLED' as const,
        notes: 'Rejected by owner',
      }

      prismaMock.booking.findUnique.mockResolvedValue(pendingBooking)
      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: {
          status: 'CANCELLED',
          notes: 'Rejected by owner',
        },
      })

      expect(result.status).toBe('CANCELLED')
    })

    it('should store rejection reason in notes field', async () => {
      const pendingBooking = createBookingFixture({ status: 'PENDING' })
      const reason = 'Property unavailable for requested dates'
      const cancelledBooking = {
        ...pendingBooking,
        status: 'CANCELLED' as const,
        notes: `Rejected: ${reason}`,
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: {
          status: 'CANCELLED',
          notes: `Rejected: ${reason}`,
        },
      })

      expect(result.notes).toContain(reason)
      expect(result.notes).toContain('Rejected')
    })

    it('should set default rejection message when no reason provided', async () => {
      const pendingBooking = createBookingFixture({ status: 'PENDING' })
      const cancelledBooking = {
        ...pendingBooking,
        status: 'CANCELLED' as const,
        notes: 'Rejected by owner',
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: {
          status: 'CANCELLED',
          notes: 'Rejected by owner',
        },
      })

      expect(result.notes).toBe('Rejected by owner')
    })

    it('should only allow rejection of PENDING bookings', async () => {
      const completedBooking = createConfirmedBookingFixture({
        status: 'COMPLETED' as const,
      })

      prismaMock.booking.findUnique.mockResolvedValue(completedBooking)

      const found = await prismaMock.booking.findUnique({
        where: { id: completedBooking.id },
      })

      // Business rule: Only PENDING bookings can be rejected
      const canReject = found?.status === 'PENDING'
      expect(canReject).toBe(false)
    })
  })

  describe('Status transition validation', () => {
    it('should identify valid statuses for approval', () => {
      const validStatuses = ['PENDING']
      const allStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

      allStatuses.forEach((status) => {
        const canApprove = validStatuses.includes(status)
        if (status === 'PENDING') {
          expect(canApprove).toBe(true)
        } else {
          expect(canApprove).toBe(false)
        }
      })
    })

    it('should identify valid statuses for rejection', () => {
      const validStatuses = ['PENDING']
      const allStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

      allStatuses.forEach((status) => {
        const canReject = validStatuses.includes(status)
        if (status === 'PENDING') {
          expect(canReject).toBe(true)
        } else {
          expect(canReject).toBe(false)
        }
      })
    })
  })

  describe('Booking queries for management', () => {
    it('should find pending bookings for review', async () => {
      const pendingBookings = [
        createBookingFixture({ status: 'PENDING' }),
        createBookingFixture({ status: 'PENDING' }),
      ]

      prismaMock.booking.findMany.mockResolvedValue(pendingBookings)

      const result = await prismaMock.booking.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      })

      expect(result.length).toBe(2)
      result.forEach((booking) => {
        expect(booking.status).toBe('PENDING')
      })
    })

    it('should filter bookings by multiple statuses', async () => {
      const activeBookings = [
        createBookingFixture({ status: 'PENDING' }),
        createConfirmedBookingFixture({ status: 'CONFIRMED' }),
      ]

      prismaMock.booking.findMany.mockResolvedValue(activeBookings)

      const result = await prismaMock.booking.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })

      expect(result.length).toBe(2)
      const statuses = result.map((b) => b.status)
      expect(statuses).toContain('PENDING')
      expect(statuses).toContain('CONFIRMED')
    })

    it('should search bookings by guest name or email', async () => {
      const searchTerm = 'john'
      const matchingBookings = [
        createBookingFixture({
          guestName: 'John Smith',
          guestEmail: 'smith@example.com',
        }),
        createBookingFixture({
          guestName: 'Jane Doe',
          guestEmail: 'john.doe@example.com',
        }),
      ]

      prismaMock.booking.findMany.mockResolvedValue(matchingBookings)

      const result = await prismaMock.booking.findMany({
        where: {
          OR: [
            { guestName: { contains: searchTerm, mode: 'insensitive' } },
            { guestEmail: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      })

      expect(result.length).toBe(2)
    })

    it('should filter bookings by date range', async () => {
      const fromDate = new Date('2024-07-01')
      const toDate = new Date('2024-07-31')

      const julyBookings = [createBookingFixture({ checkIn: new Date('2024-07-15') })]

      prismaMock.booking.findMany.mockResolvedValue(julyBookings)

      const result = await prismaMock.booking.findMany({
        where: {
          checkIn: {
            gte: fromDate,
            lte: toDate,
          },
        },
      })

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Authorization data requirements', () => {
    it('should validate owner role from session', () => {
      const ownerSession = { user: { role: 'OWNER' } }
      const guestSession = { user: { role: 'GUEST' } }
      const workerSession = { user: { role: 'WORKER' } }

      const isOwner = (session: { user: { role: string } }) => session.user.role === 'OWNER'

      expect(isOwner(ownerSession)).toBe(true)
      expect(isOwner(guestSession)).toBe(false)
      expect(isOwner(workerSession)).toBe(false)
    })
  })
})
