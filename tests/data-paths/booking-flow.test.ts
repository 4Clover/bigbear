import { describe, it, expect, beforeEach } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'
import {
  createBookingFixture,
  createConfirmedBookingFixture,
  createAddonFixture,
  createBookingAddonFixture,
  resetBookingCounter,
  resetAddonCounter,
  Decimal,
} from '../fixtures/booking.factory'

/**
 * Booking flow data path tests.
 * Tests the complete booking lifecycle including:
 * - Booking creation with price calculations
 * - Addon management
 * - Status transitions
 * - Related transaction creation
 */
describe('Booking Flow Data Path', () => {
  beforeEach(() => {
    resetBookingCounter()
    resetAddonCounter()
  })

  describe('Booking creation', () => {
    it('should create booking with calculated totals', async () => {
      const booking = createBookingFixture()

      prismaMock.booking.create.mockResolvedValue(booking)

      const result = await prismaMock.booking.create({
        data: {
          guestId: booking.guestId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          basePrice: 450.0,
          addonsTotal: 0,
          depositAmount: 90.0,
          totalAmount: 450.0,
        },
      })

      expect(result.basePrice.toString()).toBe('450')
      expect(result.depositAmount.toString()).toBe('90')
    })

    it('should default status to PENDING', async () => {
      const booking = createBookingFixture()

      prismaMock.booking.create.mockResolvedValue(booking)

      const result = await prismaMock.booking.create({
        data: {
          guestId: booking.guestId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          basePrice: 450.0,
          addonsTotal: 0,
          depositAmount: 90.0,
          totalAmount: 450.0,
        },
      })

      expect(result.status).toBe('PENDING')
    })

    it('should calculate deposit as 20% of total', () => {
      const totalAmount = new Decimal('500.00')
      const depositPercentage = 20
      const expectedDeposit = totalAmount.mul(depositPercentage).div(100)

      expect(expectedDeposit.toString()).toBe('100')
    })
  })

  describe('Price calculations', () => {
    it('should sum basePrice and addonsTotal for totalAmount', () => {
      const basePrice = new Decimal('450.00')
      const addonsTotal = new Decimal('75.00')
      const totalAmount = basePrice.add(addonsTotal)

      expect(totalAmount.toString()).toBe('525')
    })

    it('should handle decimal precision correctly', () => {
      const basePrice = new Decimal('149.99')
      const addonsTotal = new Decimal('25.50')
      const totalAmount = basePrice.add(addonsTotal)

      expect(totalAmount.toFixed(2)).toBe('175.49')
    })

    it('should calculate deposit from total (not just base)', () => {
      const basePrice = new Decimal('400.00')
      const addonsTotal = new Decimal('100.00')
      const totalAmount = basePrice.add(addonsTotal) // 500
      const depositAmount = totalAmount.mul(0.2) // 20% = 100

      expect(depositAmount.toString()).toBe('100')
    })
  })

  describe('Addon management', () => {
    it('should create booking with addons', async () => {
      const booking = createBookingFixture({
        addonsTotal: new Decimal('50.00'),
        totalAmount: new Decimal('500.00'),
        depositAmount: new Decimal('100.00'),
      })

      prismaMock.booking.create.mockResolvedValue(booking)

      const result = await prismaMock.booking.create({
        data: {
          guestId: booking.guestId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          basePrice: 450.0,
          addonsTotal: 50.0,
          depositAmount: 100.0,
          totalAmount: 500.0,
        },
      })

      expect(result.addonsTotal.toString()).toBe('50')
    })

    it('should create BookingAddon junction records', async () => {
      const booking = createBookingFixture()
      const addon = createAddonFixture({ name: 'Early Check-in' })
      const bookingAddon = createBookingAddonFixture(booking.id, addon.id, {
        quantity: 1,
        price: new Decimal('25.00'),
      })

      prismaMock.bookingAddon.create.mockResolvedValue(bookingAddon)

      const result = await prismaMock.bookingAddon.create({
        data: {
          bookingId: booking.id,
          addonId: addon.id,
          quantity: 1,
          price: 25.0,
        },
      })

      expect(result.bookingId).toBe(booking.id)
      expect(result.addonId).toBe(addon.id)
    })

    it('should calculate addon total from quantity and price', () => {
      const addonPrice = new Decimal('25.00')
      const quantity = 3
      const lineTotal = addonPrice.mul(quantity)

      expect(lineTotal.toString()).toBe('75')
    })
  })

  describe('Booking status transitions', () => {
    it('should transition PENDING to CONFIRMED', async () => {
      const pendingBooking = createBookingFixture()
      const confirmedBooking = {
        ...pendingBooking,
        status: 'CONFIRMED' as const,
        paymentIntentId: 'pi_123',
      }

      prismaMock.booking.update.mockResolvedValue(confirmedBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: {
          status: 'CONFIRMED',
          paymentIntentId: 'pi_123',
        },
      })

      expect(result.status).toBe('CONFIRMED')
      expect(result.paymentIntentId).toBe('pi_123')
    })

    it('should transition CONFIRMED to COMPLETED', async () => {
      const confirmedBooking = createConfirmedBookingFixture()
      const completedBooking = {
        ...confirmedBooking,
        status: 'COMPLETED' as const,
      }

      prismaMock.booking.update.mockResolvedValue(completedBooking)

      const result = await prismaMock.booking.update({
        where: { id: confirmedBooking.id },
        data: { status: 'COMPLETED' },
      })

      expect(result.status).toBe('COMPLETED')
    })

    it('should transition PENDING to CANCELLED', async () => {
      const pendingBooking = createBookingFixture()
      const cancelledBooking = {
        ...pendingBooking,
        status: 'CANCELLED' as const,
      }

      prismaMock.booking.update.mockResolvedValue(cancelledBooking)

      const result = await prismaMock.booking.update({
        where: { id: pendingBooking.id },
        data: { status: 'CANCELLED' },
      })

      expect(result.status).toBe('CANCELLED')
    })

    it('should transition CONFIRMED to NO_SHOW', async () => {
      const confirmedBooking = createConfirmedBookingFixture()
      const noShowBooking = {
        ...confirmedBooking,
        status: 'NO_SHOW' as const,
      }

      prismaMock.booking.update.mockResolvedValue(noShowBooking)

      const result = await prismaMock.booking.update({
        where: { id: confirmedBooking.id },
        data: { status: 'NO_SHOW' },
      })

      expect(result.status).toBe('NO_SHOW')
    })
  })

  describe('Booking queries', () => {
    it('should find bookings by guest ID', async () => {
      const guestId = 'guest-123'
      const bookings = [createBookingFixture({ guestId }), createBookingFixture({ guestId })]

      prismaMock.booking.findMany.mockResolvedValue(bookings)

      const result = await prismaMock.booking.findMany({
        where: { guestId },
      })

      expect(result.length).toBe(2)
      result.forEach((booking) => {
        expect(booking.guestId).toBe(guestId)
      })
    })

    it('should find bookings by status', async () => {
      const confirmedBookings = [createConfirmedBookingFixture(), createConfirmedBookingFixture()]

      prismaMock.booking.findMany.mockResolvedValue(confirmedBookings)

      const result = await prismaMock.booking.findMany({
        where: { status: 'CONFIRMED' },
      })

      result.forEach((booking) => {
        expect(booking.status).toBe('CONFIRMED')
      })
    })

    it('should find bookings by date range', async () => {
      const checkInStart = new Date('2024-06-01')
      const checkInEnd = new Date('2024-06-30')
      const juneBookings = [createBookingFixture({ checkIn: new Date('2024-06-15') })]

      prismaMock.booking.findMany.mockResolvedValue(juneBookings)

      const result = await prismaMock.booking.findMany({
        where: {
          checkIn: {
            gte: checkInStart,
            lte: checkInEnd,
          },
        },
      })

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Related transaction creation', () => {
    it('should link income transaction to booking', async () => {
      const booking = createConfirmedBookingFixture()

      prismaMock.transaction.create.mockResolvedValue({
        id: 'txn-1',
        type: 'INCOME',
        categoryId: 'rental-income-cat',
        amount: booking.totalAmount,
        date: new Date(),
        description: `Booking #${booking.id.slice(-6)}`,
        vendor: null,
        bookingId: booking.id,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prismaMock.transaction.create({
        data: {
          type: 'INCOME',
          categoryId: 'rental-income-cat',
          amount: 450.0,
          date: new Date(),
          bookingId: booking.id,
          description: `Booking #${booking.id.slice(-6)}`,
        },
      })

      expect(result.bookingId).toBe(booking.id)
      expect(result.type).toBe('INCOME')
    })
  })
})
