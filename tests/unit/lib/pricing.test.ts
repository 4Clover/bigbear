import { describe, it, expect } from 'vitest'

/**
 * Pricing calculation tests.
 * Tests the core pricing logic for cabin bookings:
 * - Base nightly rate calculation
 * - Weekend rate premiums
 * - Cleaning fee
 * - Addon pricing
 * - Deposit calculation (percentage of total)
 * - Total amount calculation
 */

interface PricingConfig {
  baseNightlyRate: number
  weekendRate: number | null
  weekendDays: number[] // 0 = Sunday, 6 = Saturday
  cleaningFee: number
  depositPercentage: number
  minNights: number
  maxNights: number
  maxGuests: number
  petFee: number | null
  extraGuestFee: number | null
  extraGuestThreshold: number | null
}

interface Addon {
  id: string
  name: string
  price: number
  quantity: number
}

interface BookingPriceResult {
  nights: number
  basePrice: number
  weekendNights: number
  weekendSurcharge: number
  cleaningFee: number
  addonsTotal: number
  subtotal: number
  depositAmount: number
  totalAmount: number
}

// Pricing calculation logic (extracted for testing)
const calculateNights = (checkIn: Date, checkOut: Date): number => {
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
}

const countWeekendNights = (checkIn: Date, nights: number, weekendDays: number[]): number => {
  let weekendCount = 0
  for (let i = 0; i < nights; i++) {
    const date = new Date(checkIn)
    date.setDate(date.getDate() + i)
    if (weekendDays.includes(date.getDay())) {
      weekendCount++
    }
  }
  return weekendCount
}

const calculateBookingPrice = (
  checkIn: Date,
  checkOut: Date,
  config: PricingConfig,
  addons: Addon[] = [],
  numberOfGuests = 1
): BookingPriceResult => {
  const nights = calculateNights(checkIn, checkOut)

  // Calculate weekend surcharge
  const weekendNights = config.weekendRate
    ? countWeekendNights(checkIn, nights, config.weekendDays)
    : 0
  const regularNights = nights - weekendNights
  const weekendSurcharge = weekendNights * ((config.weekendRate || 0) - config.baseNightlyRate)

  // Base price = regular nights * base rate + weekend nights * weekend rate
  const basePrice = regularNights * config.baseNightlyRate +
    weekendNights * (config.weekendRate || config.baseNightlyRate)

  // Calculate addons
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0)

  // Calculate extra guest fee
  let extraGuestFee = 0
  if (config.extraGuestFee && config.extraGuestThreshold) {
    const extraGuests = Math.max(0, numberOfGuests - config.extraGuestThreshold)
    extraGuestFee = extraGuests * config.extraGuestFee * nights
  }

  // Subtotal before deposit
  const subtotal = basePrice + config.cleaningFee + addonsTotal + extraGuestFee

  // Deposit calculation
  const depositAmount = subtotal * (config.depositPercentage / 100)

  // Total amount is subtotal (deposit is included in this amount)
  const totalAmount = subtotal

  return {
    nights,
    basePrice,
    weekendNights,
    weekendSurcharge,
    cleaningFee: config.cleaningFee,
    addonsTotal,
    subtotal,
    depositAmount,
    totalAmount,
  }
}

describe('Pricing Calculation', () => {
  const defaultConfig: PricingConfig = {
    baseNightlyRate: 150,
    weekendRate: 200,
    weekendDays: [5, 6], // Friday (5), Saturday (6)
    cleaningFee: 75,
    depositPercentage: 20,
    minNights: 2,
    maxNights: 14,
    maxGuests: 8,
    petFee: 50,
    extraGuestFee: 25,
    extraGuestThreshold: 4,
  }

  describe('Night calculation', () => {
    it('should calculate correct number of nights', () => {
      const checkIn = new Date('2024-06-01')
      const checkOut = new Date('2024-06-04')

      expect(calculateNights(checkIn, checkOut)).toBe(3)
    })

    it('should handle single night stays', () => {
      const checkIn = new Date('2024-06-01')
      const checkOut = new Date('2024-06-02')

      expect(calculateNights(checkIn, checkOut)).toBe(1)
    })

    it('should handle week-long stays', () => {
      const checkIn = new Date('2024-06-01')
      const checkOut = new Date('2024-06-08')

      expect(calculateNights(checkIn, checkOut)).toBe(7)
    })

    it('should handle two-week stays', () => {
      const checkIn = new Date('2024-06-01')
      const checkOut = new Date('2024-06-15')

      expect(calculateNights(checkIn, checkOut)).toBe(14)
    })
  })

  describe('Weekend night detection', () => {
    it('should count Friday and Saturday nights as weekends', () => {
      // June 7, 2024 is a Friday (getDay() = 5)
      // 2 nights: Friday (5) and Saturday (6) - both weekends
      const checkIn = new Date(2024, 5, 7) // Month is 0-indexed, so 5 = June
      const nights = 2

      const weekendNights = countWeekendNights(checkIn, nights, [5, 6])

      expect(weekendNights).toBe(2)
    })

    it('should not count weekday nights as weekends', () => {
      // June 3, 2024 is a Monday (getDay() = 1)
      // 3 nights: Monday (1), Tuesday (2), Wednesday (3) - no weekends
      const checkIn = new Date(2024, 5, 3) // Monday
      const nights = 3

      const weekendNights = countWeekendNights(checkIn, nights, [5, 6])

      expect(weekendNights).toBe(0)
    })

    it('should count mixed weekday/weekend stays correctly', () => {
      // June 6, 2024 is a Thursday (getDay() = 4)
      // 4 nights: Thursday (4), Friday (5), Saturday (6), Sunday (0)
      // Weekend nights: Friday and Saturday = 2
      const checkIn = new Date(2024, 5, 6) // Thursday
      const nights = 4

      const weekendNights = countWeekendNights(checkIn, nights, [5, 6])

      expect(weekendNights).toBe(2) // Friday and Saturday
    })
  })

  describe('Base price calculation', () => {
    it('should calculate weekday-only stay correctly', () => {
      // Monday June 3 to Wednesday June 5 = 2 nights @ $150
      const checkIn = new Date(2024, 5, 3) // Monday
      const checkOut = new Date(2024, 5, 5) // Wednesday

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.nights).toBe(2)
      expect(result.basePrice).toBe(300) // 2 nights * $150
      expect(result.weekendNights).toBe(0)
    })

    it('should calculate weekend stay with premium rate', () => {
      // Friday June 7 to Sunday June 9 = 2 nights @ $200
      const checkIn = new Date(2024, 5, 7) // Friday
      const checkOut = new Date(2024, 5, 9) // Sunday

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.nights).toBe(2)
      expect(result.basePrice).toBe(400) // 2 nights * $200 weekend rate
      expect(result.weekendNights).toBe(2)
    })

    it('should calculate mixed stay with both rates', () => {
      // Thursday June 6 to Sunday June 9 = 3 nights (1 weekday @ $150, 2 weekend @ $200)
      const checkIn = new Date(2024, 5, 6) // Thursday
      const checkOut = new Date(2024, 5, 9) // Sunday

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.nights).toBe(3)
      expect(result.weekendNights).toBe(2)
      expect(result.basePrice).toBe(550) // 1 * $150 + 2 * $200
    })

    it('should use base rate when no weekend rate configured', () => {
      const configNoWeekend = { ...defaultConfig, weekendRate: null }
      const checkIn = new Date(2024, 5, 7) // Friday
      const checkOut = new Date(2024, 5, 9) // Sunday

      const result = calculateBookingPrice(checkIn, checkOut, configNoWeekend)

      expect(result.basePrice).toBe(300) // 2 * $150
      expect(result.weekendNights).toBe(0)
    })
  })

  describe('Cleaning fee', () => {
    it('should add cleaning fee to total', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.cleaningFee).toBe(75)
      expect(result.subtotal).toBe(375) // $300 base + $75 cleaning
    })

    it('should handle zero cleaning fee', () => {
      const configNoClean = { ...defaultConfig, cleaningFee: 0 }
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, configNoClean)

      expect(result.cleaningFee).toBe(0)
      expect(result.subtotal).toBe(300)
    })
  })

  describe('Addon calculation', () => {
    it('should add single addon to total', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')
      const addons = [{ id: '1', name: 'Early Check-in', price: 25, quantity: 1 }]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      expect(result.addonsTotal).toBe(25)
      expect(result.subtotal).toBe(400) // $300 + $75 + $25
    })

    it('should sum multiple addons correctly', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')
      const addons = [
        { id: '1', name: 'Early Check-in', price: 25, quantity: 1 },
        { id: '2', name: 'Late Check-out', price: 25, quantity: 1 },
        { id: '3', name: 'Pet Fee', price: 50, quantity: 1 },
      ]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      expect(result.addonsTotal).toBe(100)
    })

    it('should handle addon quantities greater than 1', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')
      const addons = [{ id: '1', name: 'Extra Towel Set', price: 10, quantity: 3 }]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      expect(result.addonsTotal).toBe(30)
    })

    it('should handle no addons', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, [])

      expect(result.addonsTotal).toBe(0)
    })
  })

  describe('Deposit calculation', () => {
    it('should calculate 20% deposit correctly', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      // Subtotal = $375 ($300 + $75), deposit = 20% = $75
      expect(result.depositAmount).toBe(75)
    })

    it('should calculate deposit including addons', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')
      const addons = [{ id: '1', name: 'Pet', price: 50, quantity: 1 }]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      // Subtotal = $425 ($300 + $75 + $50), deposit = 20% = $85
      expect(result.depositAmount).toBe(85)
    })

    it('should handle different deposit percentages', () => {
      const config30 = { ...defaultConfig, depositPercentage: 30 }
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, config30)

      // Subtotal = $375, deposit = 30% = $112.50
      expect(result.depositAmount).toBe(112.5)
    })

    it('should handle 0% deposit', () => {
      const configNoDeposit = { ...defaultConfig, depositPercentage: 0 }
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')

      const result = calculateBookingPrice(checkIn, checkOut, configNoDeposit)

      expect(result.depositAmount).toBe(0)
    })
  })

  describe('Total amount calculation', () => {
    it('should calculate complete booking total', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-05')
      const addons = [{ id: '1', name: 'Pet', price: 50, quantity: 1 }]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      // 2 nights @ $150 = $300
      // Cleaning = $75
      // Addon = $50
      // Total = $425
      expect(result.totalAmount).toBe(425)
    })

    it('should produce consistent subtotal and total', () => {
      const checkIn = new Date('2024-06-03')
      const checkOut = new Date('2024-06-08')

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.subtotal).toBe(result.totalAmount)
      expect(result.subtotal).toBe(result.basePrice + result.cleaningFee + result.addonsTotal)
    })
  })

  describe('Complex booking scenarios', () => {
    it('should calculate week-long stay with weekend premium', () => {
      // Monday June 3 to Monday June 10 = 7 nights
      // 5 weekday nights @ $150 = $750
      // 2 weekend nights @ $200 = $400
      // Cleaning = $75
      // Total = $1225
      const checkIn = new Date(2024, 5, 3) // Monday
      const checkOut = new Date(2024, 5, 10) // Monday

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.nights).toBe(7)
      expect(result.weekendNights).toBe(2)
      expect(result.basePrice).toBe(1150) // 5*150 + 2*200
      expect(result.totalAmount).toBe(1225) // 1150 + 75
    })

    it('should calculate two-week maximum stay', () => {
      const checkIn = new Date(2024, 5, 3) // Monday
      const checkOut = new Date(2024, 5, 17) // Monday

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig)

      expect(result.nights).toBe(14)
      expect(result.weekendNights).toBe(4) // 2 weekends
    })

    it('should handle luxury booking with all features', () => {
      const checkIn = new Date(2024, 5, 6) // Thursday
      const checkOut = new Date(2024, 5, 9) // Sunday
      const addons = [
        { id: '1', name: 'Early Check-in', price: 25, quantity: 1 },
        { id: '2', name: 'Late Check-out', price: 25, quantity: 1 },
        { id: '3', name: 'Welcome Basket', price: 75, quantity: 1 },
      ]

      const result = calculateBookingPrice(checkIn, checkOut, defaultConfig, addons)

      // 1 weekday @ $150 + 2 weekend @ $200 = $550
      // Cleaning = $75
      // Addons = $125
      // Total = $750
      expect(result.basePrice).toBe(550)
      expect(result.addonsTotal).toBe(125)
      expect(result.totalAmount).toBe(750)
      expect(result.depositAmount).toBe(150) // 20% of $750
    })
  })
})
