import type { Booking, BookingStatus, Addon, BookingAddon } from '@prisma/client'
import { Prisma } from '@prisma/client'

// Use Prisma's Decimal for proper type compatibility
const Decimal = Prisma.Decimal

let bookingCounter = 0
let addonCounter = 0

export const createBookingFixture = (overrides: Partial<Booking> = {}): Booking => {
  bookingCounter++
  const now = new Date()
  const checkIn = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000)

  const basePrice = new Decimal('450.00')
  const addonsTotal = new Decimal('0.00')
  const totalAmount = basePrice.add(addonsTotal)
  const depositAmount = totalAmount.mul(0.2)

  return {
    id: `booking-${bookingCounter}`,
    guestId: `guest-${bookingCounter}`,
    checkIn,
    checkOut,
    guestName: `Guest ${bookingCounter}`,
    guestEmail: `guest${bookingCounter}@example.com`,
    guestPhone: null,
    numberOfGuests: 2,
    specialRequests: null,
    basePrice,
    addonsTotal,
    depositAmount,
    totalAmount,
    paymentIntentId: null,
    status: 'PENDING',
    paymentMethod: 'STRIPE',
    holdExpiresAt: null,
    paymentClaimedAt: null,
    checkoutEmailSentAt: null,
    reviewInviteAttempts: 0,
    reviewInviteLastAttemptAt: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const createHoldBookingFixture = (overrides: Partial<Booking> = {}): Booking => {
  return createBookingFixture({
    status: 'PENDING',
    paymentMethod: 'VENMO',
    holdExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  })
}

export const createConfirmedBookingFixture = (overrides: Partial<Booking> = {}): Booking => {
  return createBookingFixture({
    status: 'CONFIRMED' as BookingStatus,
    paymentIntentId: `pi_${Date.now()}`,
    ...overrides,
  })
}

export const createAddonFixture = (overrides: Partial<Addon> = {}): Addon => {
  addonCounter++
  const now = new Date()

  return {
    id: `addon-${addonCounter}`,
    name: `Addon ${addonCounter}`,
    description: `Description for addon ${addonCounter}`,
    price: new Decimal('25.00'),
    isActive: true,
    sortOrder: addonCounter,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const createBookingAddonFixture = (
  bookingId: string,
  addonId: string,
  overrides: Partial<BookingAddon> = {}
): BookingAddon => {
  return {
    id: `booking-addon-${bookingId}-${addonId}`,
    bookingId,
    addonId,
    quantity: 1,
    price: new Decimal('25.00'),
    ...overrides,
  }
}

export const resetBookingCounter = (): void => {
  bookingCounter = 0
}

export const resetAddonCounter = (): void => {
  addonCounter = 0
}

// Export Decimal for test files to use
export { Decimal }
