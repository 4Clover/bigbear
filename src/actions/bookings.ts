'use server'

import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { calculateRefund } from '@/lib/utils/refund'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

const assertOwner = async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }
  return session
}

export const cancelBooking = async (
  bookingId: string,
  initiatedBy: 'guest' | 'owner'
) => {
  await assertOwner()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'CONFIRMED') throw new Error('Booking cannot be cancelled')

  const refund = calculateRefund(
    booking.checkIn,
    new Date(),
    Number(booking.totalAmount),
    Number(booking.depositAmount)
  )

  let refundId: string | null = null

  if (refund.amount > 0 && booking.paymentIntentId) {
    const stripeRefund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      amount: Math.round(refund.amount * 100),
      reason: 'requested_by_customer',
      metadata: {
        bookingId: booking.id,
        refundType: refund.type,
        initiatedBy,
      },
    })
    refundId = stripeRefund.id
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: refund.type === 'full' ? 'CANCELLED' : 'CANCELLED',
      notes: booking.notes
        ? `${booking.notes}\n\nCancelled by ${initiatedBy}. Refund: ${refund.type} ($${refund.amount.toFixed(2)})`
        : `Cancelled by ${initiatedBy}. Refund: ${refund.type} ($${refund.amount.toFixed(2)})`,
    },
  })

  revalidatePath('/owner/bookings')
  revalidatePath('/owner/dashboard')

  return { success: true, refund, refundId }
}

export const approveBookingRequest = async (bookingId: string) => {
  await assertOwner()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'PENDING') throw new Error('Booking is not pending')

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' },
  })

  // TODO: Send approval email to guest

  revalidatePath('/owner/bookings')
  revalidatePath('/owner/dashboard')

  return { success: true }
}

export const rejectBookingRequest = async (bookingId: string, reason?: string) => {
  await assertOwner()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'PENDING') throw new Error('Booking is not pending')

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      notes: reason ? `Rejected: ${reason}` : 'Rejected by owner',
    },
  })

  // TODO: Send rejection email to guest with reason

  revalidatePath('/owner/bookings')
  revalidatePath('/owner/dashboard')

  return { success: true }
}
