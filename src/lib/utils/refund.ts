import { differenceInDays } from 'date-fns'

export type RefundType = 'full' | 'partial' | 'none'

export interface RefundCalculation {
  type: RefundType
  percentage: number
  amount: number
  reason: string
}

export const calculateRefund = (
  checkInDate: Date,
  cancellationDate: Date,
  totalAmount: number,
  depositAmount: number
): RefundCalculation => {
  const daysUntilCheckIn = differenceInDays(checkInDate, cancellationDate)

  // Refundable amount is total minus deposit (deposit is non-refundable)
  const refundableAmount = totalAmount - depositAmount

  if (daysUntilCheckIn >= 14) {
    return {
      type: 'full',
      percentage: 100,
      amount: refundableAmount,
      reason: 'Cancelled 14+ days before check-in',
    }
  }

  if (daysUntilCheckIn >= 7) {
    return {
      type: 'partial',
      percentage: 50,
      amount: refundableAmount * 0.5,
      reason: 'Cancelled 7-13 days before check-in (50% refund)',
    }
  }

  return {
    type: 'none',
    percentage: 0,
    amount: 0,
    reason: 'Cancelled within 7 days of check-in (no refund)',
  }
}
