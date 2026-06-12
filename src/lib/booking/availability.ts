import type { TransactionClient } from '@/lib/prisma'

/**
 * Cancel PENDING Holds whose hold window has lapsed and that overlap the
 * requested range. Belt-and-suspenders sweep that runs inside the booking
 * $transaction so a stale Hold can never falsely block a new booking between
 * cron runs (ADR 0001).
 *
 * Must be called inside a $transaction.
 */
export async function cancelExpiredOverlappingHolds(
  tx: TransactionClient,
  checkIn: Date,
  checkOut: Date
): Promise<number> {
  const result = await tx.booking.updateMany({
    where: {
      status: 'PENDING',
      holdExpiresAt: { lt: new Date() },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    data: { status: 'CANCELLED', notes: 'Hold expired — auto-cancelled during booking sweep' },
  })
  return result.count
}

/**
 * Returns true when the requested range has no conflicts with live
 * confirmed/pending bookings or manually blocked dates.
 *
 * Must be called inside a $transaction (after the expired-hold sweep) so the
 * check and the subsequent insert are atomic. The widened exclusion
 * constraint is the final backstop against TOCTOU races.
 */
export async function isRangeAvailable(
  tx: TransactionClient,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const bookingConflict = await tx.booking.findFirst({
    where: {
      status: { in: ['CONFIRMED', 'PENDING', 'COMPLETED', 'NO_SHOW'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { id: true },
  })
  if (bookingConflict) return false

  const blockedConflict = await tx.blockedDate.findFirst({
    where: {
      startDate: { lt: checkOut },
      endDate: { gt: checkIn },
    },
    select: { id: true },
  })
  return blockedConflict === null
}
