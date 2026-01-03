import type { Booking, BookingStatus, Addon, BookingAddon } from '@prisma/client'

// Simple Decimal-like class for test fixtures
class TestDecimal {
  private value: number

  constructor(value: string | number) {
    this.value = typeof value === 'string' ? parseFloat(value) : value
  }

  add(other: TestDecimal | number): TestDecimal {
    const otherValue = other instanceof TestDecimal ? other.value : other
    return new TestDecimal(this.value + otherValue)
  }

  mul(other: number): TestDecimal {
    return new TestDecimal(this.value * other)
  }

  toString(): string {
    return String(this.value)
  }

  toFixed(decimals: number): string {
    return this.value.toFixed(decimals)
  }

  toNumber(): number {
    return this.value
  }
}

const Decimal = TestDecimal as any

let bookingCounter = 0
let addonCounter = 0

export const createBookingFixture = (
  overrides: Partial<Booking> = {}
): Booking => {
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
    status: 'PENDING' as BookingStatus,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const createConfirmedBookingFixture = (
  overrides: Partial<Booking> = {}
): Booking => {
  return createBookingFixture({
    status: 'CONFIRMED' as BookingStatus,
    paymentIntentId: `pi_${Date.now()}`,
    ...overrides,
  })
}

export const createAddonFixture = (
  overrides: Partial<Addon> = {}
): Addon => {
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
