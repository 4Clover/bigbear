import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { startOfDay } from 'date-fns'

/**
 * Booking validation tests.
 * Tests input validation for booking requests:
 * - Date validation (check-in/check-out order, past dates)
 * - Stay duration limits (min/max nights)
 * - Guest count limits
 * - Required field validation
 * - Email/phone format validation
 */

interface BookingRequest {
  checkIn: Date
  checkOut: Date
  guestName: string
  guestEmail: string
  guestPhone?: string
  numberOfGuests: number
  addons?: { id: string; quantity: number }[]
}

interface PricingConfig {
  minNights: number
  maxNights: number
  maxGuests: number
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Validation functions
const validateBookingDates = (
  checkIn: Date,
  checkOut: Date,
  config: PricingConfig
): ValidationResult => {
  const errors: string[] = []
  const today = startOfDay(new Date())
  const checkInNorm = startOfDay(checkIn)
  const checkOutNorm = startOfDay(checkOut)

  // Check-in must be in the future
  if (checkInNorm < today) {
    errors.push('Check-in date must be in the future')
  }

  // Check-out must be after check-in
  if (checkOutNorm <= checkInNorm) {
    errors.push('Check-out date must be after check-in date')
  }

  // Calculate nights
  const nights = Math.ceil((checkOutNorm.getTime() - checkInNorm.getTime()) / (1000 * 60 * 60 * 24))

  // Minimum nights
  if (nights < config.minNights) {
    errors.push(`Minimum stay is ${config.minNights} nights`)
  }

  // Maximum nights
  if (nights > config.maxNights) {
    errors.push(`Maximum stay is ${config.maxNights} nights`)
  }

  return { valid: errors.length === 0, errors }
}

const validateGuestCount = (numberOfGuests: number, maxGuests: number): ValidationResult => {
  const errors: string[] = []

  if (numberOfGuests < 1) {
    errors.push('At least 1 guest is required')
  }

  if (numberOfGuests > maxGuests) {
    errors.push(`Maximum ${maxGuests} guests allowed`)
  }

  return { valid: errors.length === 0, errors }
}

const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || email.trim() === '') {
    errors.push('Email is required')
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email format')
  }

  return { valid: errors.length === 0, errors }
}

const validatePhone = (phone: string | undefined): ValidationResult => {
  const errors: string[] = []

  if (phone) {
    // Simple phone validation - at least 10 digits
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10) {
      errors.push('Phone number must have at least 10 digits')
    }
    if (digitsOnly.length > 15) {
      errors.push('Phone number is too long')
    }
  }

  return { valid: errors.length === 0, errors }
}

const validateGuestName = (name: string): ValidationResult => {
  const errors: string[] = []

  if (!name || name.trim() === '') {
    errors.push('Guest name is required')
  } else if (name.trim().length < 2) {
    errors.push('Guest name must be at least 2 characters')
  } else if (name.trim().length > 100) {
    errors.push('Guest name is too long')
  }

  return { valid: errors.length === 0, errors }
}

const validateAddonQuantities = (
  addons: { id: string; quantity: number }[] | undefined
): ValidationResult => {
  const errors: string[] = []

  if (addons) {
    for (const addon of addons) {
      if (addon.quantity < 1) {
        errors.push(`Addon quantity must be at least 1`)
      }
      if (addon.quantity > 10) {
        errors.push(`Maximum addon quantity is 10`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

const validateBookingRequest = (
  request: BookingRequest,
  config: PricingConfig
): ValidationResult => {
  const allErrors: string[] = []

  const dateValidation = validateBookingDates(request.checkIn, request.checkOut, config)
  allErrors.push(...dateValidation.errors)

  const guestValidation = validateGuestCount(request.numberOfGuests, config.maxGuests)
  allErrors.push(...guestValidation.errors)

  const nameValidation = validateGuestName(request.guestName)
  allErrors.push(...nameValidation.errors)

  const emailValidation = validateEmail(request.guestEmail)
  allErrors.push(...emailValidation.errors)

  const phoneValidation = validatePhone(request.guestPhone)
  allErrors.push(...phoneValidation.errors)

  const addonValidation = validateAddonQuantities(request.addons)
  allErrors.push(...addonValidation.errors)

  return { valid: allErrors.length === 0, errors: allErrors }
}

describe('Booking Validation', () => {
  const defaultConfig: PricingConfig = {
    minNights: 2,
    maxNights: 14,
    maxGuests: 8,
  }

  describe('Date validation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-01'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should accept valid future dates with minimum nights', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-12'),
        defaultConfig
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject check-in in the past', () => {
      const result = validateBookingDates(
        new Date('2024-05-25'),
        new Date('2024-05-28'),
        defaultConfig
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Check-in date must be in the future')
    })

    it('should reject check-out before check-in', () => {
      const result = validateBookingDates(
        new Date('2024-06-15'),
        new Date('2024-06-10'),
        defaultConfig
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Check-out date must be after check-in date')
    })

    it('should reject check-out same as check-in', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-10'),
        defaultConfig
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Check-out date must be after check-in date')
    })

    it('should reject stay shorter than minimum nights', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-11'), // 1 night
        defaultConfig
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Minimum stay is 2 nights')
    })

    it('should reject stay longer than maximum nights', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-30'), // 20 nights
        defaultConfig
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Maximum stay is 14 nights')
    })

    it('should accept exactly minimum nights', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-12'), // 2 nights
        defaultConfig
      )

      expect(result.valid).toBe(true)
    })

    it('should accept exactly maximum nights', () => {
      const result = validateBookingDates(
        new Date('2024-06-10'),
        new Date('2024-06-24'), // 14 nights
        defaultConfig
      )

      expect(result.valid).toBe(true)
    })

    it('should allow check-in on current day', () => {
      const result = validateBookingDates(
        new Date('2024-06-01'), // Today
        new Date('2024-06-03'),
        defaultConfig
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('Guest count validation', () => {
    it('should accept valid guest count', () => {
      const result = validateGuestCount(4, 8)

      expect(result.valid).toBe(true)
    })

    it('should accept minimum (1) guest', () => {
      const result = validateGuestCount(1, 8)

      expect(result.valid).toBe(true)
    })

    it('should accept maximum guests', () => {
      const result = validateGuestCount(8, 8)

      expect(result.valid).toBe(true)
    })

    it('should reject zero guests', () => {
      const result = validateGuestCount(0, 8)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 guest is required')
    })

    it('should reject negative guests', () => {
      const result = validateGuestCount(-1, 8)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 guest is required')
    })

    it('should reject exceeding max guests', () => {
      const result = validateGuestCount(10, 8)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Maximum 8 guests allowed')
    })
  })

  describe('Email validation', () => {
    it('should accept valid email', () => {
      const result = validateEmail('guest@example.com')

      expect(result.valid).toBe(true)
    })

    it('should accept email with subdomain', () => {
      const result = validateEmail('guest@mail.example.com')

      expect(result.valid).toBe(true)
    })

    it('should accept email with plus sign', () => {
      const result = validateEmail('guest+booking@example.com')

      expect(result.valid).toBe(true)
    })

    it('should reject empty email', () => {
      const result = validateEmail('')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Email is required')
    })

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Email is required')
    })

    it('should reject email without @', () => {
      const result = validateEmail('guestexample.com')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should reject email without domain', () => {
      const result = validateEmail('guest@')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should reject email without TLD', () => {
      const result = validateEmail('guest@example')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })
  })

  describe('Phone validation', () => {
    it('should accept valid 10-digit phone', () => {
      const result = validatePhone('5551234567')

      expect(result.valid).toBe(true)
    })

    it('should accept formatted phone number', () => {
      const result = validatePhone('(555) 123-4567')

      expect(result.valid).toBe(true)
    })

    it('should accept international phone number', () => {
      const result = validatePhone('+1-555-123-4567')

      expect(result.valid).toBe(true)
    })

    it('should accept undefined phone (optional)', () => {
      const result = validatePhone(undefined)

      expect(result.valid).toBe(true)
    })

    it('should reject too short phone number', () => {
      const result = validatePhone('555-1234') // Only 7 digits

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Phone number must have at least 10 digits')
    })

    it('should reject too long phone number', () => {
      const result = validatePhone('12345678901234567890') // 20 digits

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Phone number is too long')
    })
  })

  describe('Guest name validation', () => {
    it('should accept valid name', () => {
      const result = validateGuestName('John Doe')

      expect(result.valid).toBe(true)
    })

    it('should accept minimum length name', () => {
      const result = validateGuestName('Jo')

      expect(result.valid).toBe(true)
    })

    it('should reject empty name', () => {
      const result = validateGuestName('')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Guest name is required')
    })

    it('should reject whitespace-only name', () => {
      const result = validateGuestName('   ')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Guest name is required')
    })

    it('should reject single character name', () => {
      const result = validateGuestName('J')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Guest name must be at least 2 characters')
    })

    it('should reject extremely long name', () => {
      const result = validateGuestName('A'.repeat(101))

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Guest name is too long')
    })
  })

  describe('Addon quantity validation', () => {
    it('should accept valid addon quantities', () => {
      const result = validateAddonQuantities([
        { id: 'addon-1', quantity: 1 },
        { id: 'addon-2', quantity: 3 },
      ])

      expect(result.valid).toBe(true)
    })

    it('should accept undefined addons', () => {
      const result = validateAddonQuantities(undefined)

      expect(result.valid).toBe(true)
    })

    it('should accept empty addons array', () => {
      const result = validateAddonQuantities([])

      expect(result.valid).toBe(true)
    })

    it('should reject zero quantity', () => {
      const result = validateAddonQuantities([{ id: 'addon-1', quantity: 0 }])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Addon quantity must be at least 1')
    })

    it('should reject negative quantity', () => {
      const result = validateAddonQuantities([{ id: 'addon-1', quantity: -1 }])

      expect(result.valid).toBe(false)
    })

    it('should reject excessive quantity', () => {
      const result = validateAddonQuantities([{ id: 'addon-1', quantity: 15 }])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Maximum addon quantity is 10')
    })
  })

  describe('Complete booking request validation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-01'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should accept valid booking request', () => {
      const request: BookingRequest = {
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-13'),
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '555-123-4567',
        numberOfGuests: 4,
        addons: [{ id: 'addon-1', quantity: 1 }],
      }

      const result = validateBookingRequest(request, defaultConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should collect all validation errors', () => {
      const request: BookingRequest = {
        checkIn: new Date('2024-05-25'), // Past
        checkOut: new Date('2024-05-26'), // Only 1 night
        guestName: '', // Empty
        guestEmail: 'invalid', // Invalid
        numberOfGuests: 10, // Exceeds max
        addons: [{ id: 'addon-1', quantity: 0 }], // Zero quantity
      }

      const result = validateBookingRequest(request, defaultConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(3)
    })

    it('should accept minimal valid request', () => {
      const request: BookingRequest = {
        checkIn: new Date('2024-06-10'),
        checkOut: new Date('2024-06-12'),
        guestName: 'Jane',
        guestEmail: 'j@x.co',
        numberOfGuests: 1,
      }

      const result = validateBookingRequest(request, defaultConfig)

      expect(result.valid).toBe(true)
    })
  })
})
