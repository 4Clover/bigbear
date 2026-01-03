import { Resend } from 'resend'
import { prisma } from './prisma'
import type { Booking, NotificationEvent } from '@prisma/client'
import { format } from 'date-fns'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com'

export const sendBookingConfirmation = async (booking: Booking) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'BOOKING_CONFIRMED' },
  })

  if (!preference?.emailEnabled) return

  const checkInFormatted = format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')

  try {
    await resend.emails.send({
      from: fromEmail,
      to: booking.guestEmail,
      subject: 'Booking Confirmed - Big Bear Cabin',
      html: `
        <h1>Your Booking is Confirmed!</h1>
        <p>Hello ${booking.guestName},</p>
        <p>Thank you for booking with us. Here are your reservation details:</p>
        <ul>
          <li><strong>Check-in:</strong> ${checkInFormatted} (after 3:00 PM)</li>
          <li><strong>Check-out:</strong> ${checkOutFormatted} (before 11:00 AM)</li>
          <li><strong>Total Amount:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
        </ul>
        <p>We'll send you check-in instructions closer to your arrival date.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>We look forward to hosting you!</p>
      `,
    })

    await logNotification('BOOKING_CONFIRMED', booking.guestEmail, 'email', 'Booking Confirmed', 'sent')
  } catch (error) {
    await logNotification(
      'BOOKING_CONFIRMED',
      booking.guestEmail,
      'email',
      'Booking Confirmed',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export const sendBookingCancellation = async (booking: Booking, refundAmount: number) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'BOOKING_CANCELLED' },
  })

  if (!preference?.emailEnabled) return

  try {
    await resend.emails.send({
      from: fromEmail,
      to: booking.guestEmail,
      subject: 'Booking Cancelled - Big Bear Cabin',
      html: `
        <h1>Booking Cancellation Confirmation</h1>
        <p>Hello ${booking.guestName},</p>
        <p>Your booking has been cancelled as requested.</p>
        ${refundAmount > 0 ? `<p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p><p>Please allow 5-10 business days for the refund to appear on your statement.</p>` : '<p>Based on our cancellation policy, no refund is applicable for this cancellation.</p>'}
        <p>We hope to host you in the future!</p>
      `,
    })

    await logNotification('BOOKING_CANCELLED', booking.guestEmail, 'email', 'Booking Cancelled', 'sent')
  } catch (error) {
    await logNotification(
      'BOOKING_CANCELLED',
      booking.guestEmail,
      'email',
      'Booking Cancelled',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const logNotification = async (
  event: NotificationEvent,
  recipient: string,
  channel: string,
  subject: string,
  status: string,
  error?: string
) => {
  await prisma.notificationLog.create({
    data: {
      event,
      recipient,
      channel,
      subject,
      status,
      error,
    },
  })
}
