import { describe, it, expect } from 'vitest'
import { calculateRefund } from '@/lib/utils/refund'
import { addDays, subDays } from 'date-fns'

/**
 * Refund calculation tests.
 * Tests the cancellation refund policy which is:
 * - 14+ days before check-in: Full refund (minus deposit)
 * - 7-13 days before check-in: 50% refund (minus deposit)
 * - Less than 7 days: No refund
 *
 * Deposit is always non-refundable.
 */
describe('Refund Calculation', () => {
  const totalAmount = 500
  const depositAmount = 100 // 20% deposit

  describe('Full refund (14+ days before check-in)', () => {
    it('should return full refund when cancelled exactly 14 days before', () => {
      const checkInDate = addDays(new Date(), 14)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('full')
      expect(result.percentage).toBe(100)
      expect(result.amount).toBe(400) // Total minus deposit
    })

    it('should return full refund when cancelled 30 days before', () => {
      const checkInDate = addDays(new Date(), 30)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('full')
      expect(result.amount).toBe(400)
    })

    it('should return full refund when cancelled 365 days before', () => {
      const checkInDate = addDays(new Date(), 365)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('full')
      expect(result.percentage).toBe(100)
    })

    it('should calculate correct refund for high-value booking', () => {
      const checkInDate = addDays(new Date(), 20)
      const cancellationDate = new Date()
      const highTotal = 2500
      const highDeposit = 500

      const result = calculateRefund(checkInDate, cancellationDate, highTotal, highDeposit)

      expect(result.type).toBe('full')
      expect(result.amount).toBe(2000) // 2500 - 500
    })
  })

  describe('Partial refund (7-13 days before check-in)', () => {
    it('should return 50% refund when cancelled exactly 7 days before', () => {
      const checkInDate = addDays(new Date(), 7)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('partial')
      expect(result.percentage).toBe(50)
      expect(result.amount).toBe(200) // 50% of (500 - 100) = 200
    })

    it('should return 50% refund when cancelled 10 days before', () => {
      const checkInDate = addDays(new Date(), 10)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('partial')
      expect(result.percentage).toBe(50)
      expect(result.amount).toBe(200)
    })

    it('should return 50% refund when cancelled exactly 13 days before', () => {
      const checkInDate = addDays(new Date(), 13)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('partial')
      expect(result.percentage).toBe(50)
    })

    it('should handle odd amounts correctly for partial refunds', () => {
      const checkInDate = addDays(new Date(), 7)
      const cancellationDate = new Date()
      const oddTotal = 333
      const oddDeposit = 67

      const result = calculateRefund(checkInDate, cancellationDate, oddTotal, oddDeposit)

      expect(result.type).toBe('partial')
      expect(result.amount).toBe((333 - 67) * 0.5) // 133
    })
  })

  describe('No refund (less than 7 days before check-in)', () => {
    it('should return no refund when cancelled 6 days before', () => {
      const checkInDate = addDays(new Date(), 6)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('none')
      expect(result.percentage).toBe(0)
      expect(result.amount).toBe(0)
    })

    it('should return no refund when cancelled 1 day before', () => {
      const checkInDate = addDays(new Date(), 1)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('none')
      expect(result.amount).toBe(0)
    })

    it('should return no refund when cancelled on check-in day', () => {
      const checkInDate = new Date()
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('none')
      expect(result.amount).toBe(0)
    })

    it('should return no refund when cancelled after check-in', () => {
      const checkInDate = subDays(new Date(), 1)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.type).toBe('none')
      expect(result.amount).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero deposit correctly', () => {
      const checkInDate = addDays(new Date(), 14)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, 0)

      expect(result.type).toBe('full')
      expect(result.amount).toBe(500) // Full amount refundable
    })

    it('should handle deposit equal to total (rare case)', () => {
      const checkInDate = addDays(new Date(), 14)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, 500, 500)

      expect(result.type).toBe('full')
      expect(result.amount).toBe(0) // Nothing refundable
    })

    it('should include reason in result', () => {
      const checkInDate = addDays(new Date(), 14)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, totalAmount, depositAmount)

      expect(result.reason).toBeDefined()
      expect(result.reason.length).toBeGreaterThan(0)
    })

    it('should handle minimum booking amount', () => {
      const checkInDate = addDays(new Date(), 14)
      const cancellationDate = new Date()

      const result = calculateRefund(checkInDate, cancellationDate, 150, 30)

      expect(result.type).toBe('full')
      expect(result.amount).toBe(120)
    })
  })

  describe('Refund type exhaustiveness', () => {
    it('should only return valid RefundType values', () => {
      const validTypes = ['full', 'partial', 'none']

      const scenarios = [
        { days: 14, expectedType: 'full' },
        { days: 10, expectedType: 'partial' },
        { days: 3, expectedType: 'none' },
      ]

      scenarios.forEach(({ days, expectedType }) => {
        const checkInDate = addDays(new Date(), days)
        const result = calculateRefund(checkInDate, new Date(), totalAmount, depositAmount)

        expect(validTypes).toContain(result.type)
        expect(result.type).toBe(expectedType)
      })
    })
  })
})
