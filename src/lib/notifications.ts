import { Resend } from 'resend'
import Twilio from 'twilio'
import { prisma } from './prisma'
import { escapeHtml } from './security'
import type { Booking, NotificationEvent } from '@prisma/client'
import { format } from 'date-fns'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'

// Lazy-loaded Twilio client
let twilioClient: ReturnType<typeof Twilio> | null = null

const getTwilioClient = () => {
  if (twilioClient) return twilioClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) return null

  twilioClient = Twilio(accountSid, authToken)
  return twilioClient
}

export const sendSms = async (to: string, body: string): Promise<boolean> => {
  if (!to) return false

  const client = getTwilioClient()
  if (!client) return false

  const fromPhone = process.env.TWILIO_PHONE_NUMBER
  if (!fromPhone) return false

  try {
    await client.messages.create({
      to,
      from: fromPhone,
      body,
    })
    return true
  } catch {
    return false
  }
}

export const sendBookingConfirmation = async (booking: Booking) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'BOOKING_CONFIRMED' },
  })

  if (!preference?.emailEnabled && !preference?.smsEnabled) return

  const checkInFormatted = format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')

  // Sanitize user-provided content
  const safeGuestName = escapeHtml(booking.guestName)

  // Send email if enabled
  if (preference.emailEnabled) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: booking.guestEmail,
        subject: 'Booking Confirmed - Grizzly Getaway',
        html: `
          <h1>Your Booking is Confirmed!</h1>
          <p>Hello ${safeGuestName},</p>
          <p>Thank you for booking with us. Here are your reservation details:</p>
          <ul>
            <li><strong>Check-in:</strong> ${checkInFormatted} (after 4:00 PM)</li>
            <li><strong>Check-out:</strong> ${checkOutFormatted} (before 11:00 AM)</li>
            <li><strong>Total Amount:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
          </ul>
          <p>We'll send you check-in instructions closer to your arrival date.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>We look forward to hosting you!</p>
        `,
      })

      await logNotification(
        'BOOKING_CONFIRMED',
        booking.guestEmail,
        'email',
        'Booking Confirmed',
        'sent'
      )
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

  // Send SMS if enabled and phone available
  if (preference.smsEnabled && booking.guestPhone) {
    const smsBody = `Grizzly Getaway: Your booking is confirmed! Check-in: ${checkInFormatted}. We look forward to hosting you!`

    const success = await sendSms(booking.guestPhone, smsBody)

    await logNotification(
      'BOOKING_CONFIRMED',
      booking.guestPhone,
      'sms',
      'Booking Confirmed',
      success ? 'sent' : 'failed',
      success ? undefined : 'SMS send failed'
    )
  }
}

export const sendBookingCancellation = async (booking: Booking, refundAmount: number) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'BOOKING_CANCELLED' },
  })

  if (!preference?.emailEnabled && !preference?.smsEnabled) return

  // Sanitize user-provided content
  const safeGuestName = escapeHtml(booking.guestName)

  // Send email if enabled
  if (preference.emailEnabled) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: booking.guestEmail,
        subject: 'Booking Cancelled - Grizzly Getaway',
        html: `
          <h1>Booking Cancellation Confirmation</h1>
          <p>Hello ${safeGuestName},</p>
          <p>Your booking has been cancelled as requested.</p>
          ${refundAmount > 0 ? `<p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p><p>Please allow 5-10 business days for the refund to appear on your statement.</p>` : '<p>Based on our cancellation policy, no refund is applicable for this cancellation.</p>'}
          <p>We hope to host you in the future!</p>
        `,
      })

      await logNotification(
        'BOOKING_CANCELLED',
        booking.guestEmail,
        'email',
        'Booking Cancelled',
        'sent'
      )
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

  // Send SMS if enabled and phone available
  if (preference.smsEnabled && booking.guestPhone) {
    const refundText =
      refundAmount > 0 ? `Refund: $${refundAmount.toFixed(2)}` : 'No refund applicable'
    const smsBody = `Grizzly Getaway: Your booking has been cancelled. ${refundText}. Questions? Contact us.`

    const success = await sendSms(booking.guestPhone, smsBody)

    await logNotification(
      'BOOKING_CANCELLED',
      booking.guestPhone,
      'sms',
      'Booking Cancelled',
      success ? 'sent' : 'failed',
      success ? undefined : 'SMS send failed'
    )
  }
}

interface BookingFailedRefundInfo {
  guestEmail: string
  guestName: string
  checkIn: string
  checkOut: string
}

export const sendBookingFailedRefund = async (info: BookingFailedRefundInfo) => {
  const { guestEmail, guestName, checkIn, checkOut } = info
  const safeGuestName = escapeHtml(guestName)

  try {
    await resend.emails.send({
      from: fromEmail,
      to: guestEmail,
      subject: 'Booking Could Not Be Completed - Grizzly Getaway',
      html: `
        <h1>Booking Could Not Be Completed</h1>
        <p>Hello ${safeGuestName},</p>
        <p>We're sorry, but your booking for ${checkIn} to ${checkOut} could not be completed because the dates are no longer available.</p>
        <p>A full refund has been issued to your payment method. Please allow 5-10 business days for the refund to appear on your statement.</p>
        <p>We apologize for the inconvenience. Please visit our website to check available dates and make a new booking.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `,
    })

    await logNotification(
      'BOOKING_CANCELLED',
      guestEmail,
      'email',
      'Booking Failed - Refund Issued',
      'sent'
    )
  } catch (error) {
    await logNotification(
      'BOOKING_CANCELLED',
      guestEmail,
      'email',
      'Booking Failed - Refund Issued',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
    // Re-throw to ensure caller knows notification failed
    throw error
  }
}

export const sendCheckinReminder = async (booking: Booking) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'GUEST_CHECKIN_REMINDER' },
  })

  if (!preference?.emailEnabled && !preference?.smsEnabled) return

  const checkInFormatted = format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')
  const safeGuestName = escapeHtml(booking.guestName)

  // Send email if enabled
  if (preference.emailEnabled) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: booking.guestEmail,
        subject: 'Check-in Tomorrow - Grizzly Getaway',
        html: `
          <h1>Your Check-in is Tomorrow!</h1>
          <p>Hello ${safeGuestName},</p>
          <p>We're excited to host you! Here's a reminder about your upcoming stay:</p>
          <ul>
            <li><strong>Check-in Date:</strong> ${checkInFormatted}</li>
            <li><strong>Check-in Time:</strong> After 4:00 PM</li>
          </ul>
          <p>We'll send you the access code and check-in instructions separately.</p>
          <p>Safe travels!</p>
        `,
      })

      await logNotification(
        'GUEST_CHECKIN_REMINDER',
        booking.guestEmail,
        'email',
        'Check-in Reminder',
        'sent'
      )
    } catch (error) {
      await logNotification(
        'GUEST_CHECKIN_REMINDER',
        booking.guestEmail,
        'email',
        'Check-in Reminder',
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Send SMS if enabled and phone available
  if (preference.smsEnabled && booking.guestPhone) {
    const smsBody = `Grizzly Getaway: Your check-in is tomorrow (${checkInFormatted})! Check-in after 4 PM. See you soon!`

    const success = await sendSms(booking.guestPhone, smsBody)

    await logNotification(
      'GUEST_CHECKIN_REMINDER',
      booking.guestPhone,
      'sms',
      'Check-in Reminder',
      success ? 'sent' : 'failed',
      success ? undefined : 'SMS send failed'
    )
  }
}

export const sendCheckoutReminder = async (booking: Booking) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'GUEST_CHECKOUT_REMINDER' },
  })

  if (!preference?.emailEnabled && !preference?.smsEnabled) return

  const checkOutFormatted = format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')
  const safeGuestName = escapeHtml(booking.guestName)

  // Send email if enabled
  if (preference.emailEnabled) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: booking.guestEmail,
        subject: 'Check-out Tomorrow - Grizzly Getaway',
        html: `
          <h1>Check-out Reminder</h1>
          <p>Hello ${safeGuestName},</p>
          <p>We hope you've enjoyed your stay! Here's a reminder about your check-out:</p>
          <ul>
            <li><strong>Check-out Date:</strong> ${checkOutFormatted}</li>
            <li><strong>Check-out Time:</strong> Before 11:00 AM</li>
          </ul>
          <p><strong>Before you leave:</strong></p>
          <ul>
            <li>Turn off all lights and appliances</li>
            <li>Lock all doors and windows</li>
            <li>Leave keys in the lockbox</li>
            <li>Throw out all trash</li>
            <li>Ensure hot tub cover is replaced</li>
          </ul>
          <p>Thank you for staying with us!</p>
        `,
      })

      await logNotification(
        'GUEST_CHECKOUT_REMINDER',
        booking.guestEmail,
        'email',
        'Check-out Reminder',
        'sent'
      )
    } catch (error) {
      await logNotification(
        'GUEST_CHECKOUT_REMINDER',
        booking.guestEmail,
        'email',
        'Check-out Reminder',
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Send SMS if enabled and phone available
  if (preference.smsEnabled && booking.guestPhone) {
    const smsBody = `Grizzly Getaway: Check-out reminder for tomorrow (${checkOutFormatted}). Please check out before 11 AM. Thank you for staying!`

    const success = await sendSms(booking.guestPhone, smsBody)

    await logNotification(
      'GUEST_CHECKOUT_REMINDER',
      booking.guestPhone,
      'sms',
      'Check-out Reminder',
      success ? 'sent' : 'failed',
      success ? undefined : 'SMS send failed'
    )
  }
}

// ============================================================================
// Owner Notification Functions
// ============================================================================

interface JobInfo {
  id: string
  title: string
  description?: string | null
}

interface QuoteInfo {
  id: string
  amount: number
  description?: string | null
  estimatedDays?: number | null
}

interface CompletionInfo {
  id: string
  finalAmount?: number | null
  description?: string | null
}

export const sendBookingRequest = async (booking: Booking, ownerEmail: string) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'BOOKING_REQUEST' },
  })

  if (!preference?.emailEnabled) return

  const checkInFormatted = format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')
  const safeGuestName = escapeHtml(booking.guestName)

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: 'New Booking Request - Grizzly Getaway',
      html: `
        <h1>New Booking Request</h1>
        <p>You have received a new booking request:</p>
        <ul>
          <li><strong>Guest:</strong> ${safeGuestName}</li>
          <li><strong>Email:</strong> ${booking.guestEmail}</li>
          <li><strong>Check-in:</strong> ${checkInFormatted}</li>
          <li><strong>Check-out:</strong> ${checkOutFormatted}</li>
          <li><strong>Guests:</strong> ${booking.numberOfGuests}</li>
          <li><strong>Amount:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
        </ul>
        <p><a href="${process.env.AUTH_URL ?? 'http://localhost:3000'}/owner/bookings/${booking.id}">Review Booking</a></p>
      `,
    })

    await logNotification('BOOKING_REQUEST', ownerEmail, 'email', 'Booking Request', 'sent')
  } catch (error) {
    await logNotification(
      'BOOKING_REQUEST',
      ownerEmail,
      'email',
      'Booking Request',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export const sendPaymentReceived = async (booking: Booking, ownerEmail: string) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'PAYMENT_RECEIVED' },
  })

  if (!preference?.emailEnabled) return

  const safeGuestName = escapeHtml(booking.guestName)
  const checkInFormatted = format(new Date(booking.checkIn), 'MMMM d, yyyy')

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: 'Payment Received - Grizzly Getaway',
      html: `
        <h1>Payment Received!</h1>
        <p>A payment has been successfully processed:</p>
        <ul>
          <li><strong>Guest:</strong> ${safeGuestName}</li>
          <li><strong>Amount:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
          <li><strong>Check-in:</strong> ${checkInFormatted}</li>
        </ul>
        <p>The booking has been confirmed and the guest has been notified.</p>
      `,
    })

    await logNotification('PAYMENT_RECEIVED', ownerEmail, 'email', 'Payment Received', 'sent')
  } catch (error) {
    await logNotification(
      'PAYMENT_RECEIVED',
      ownerEmail,
      'email',
      'Payment Received',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export const sendPaymentFailed = async (
  booking: Booking,
  ownerEmail: string,
  errorMessage: string
) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'PAYMENT_FAILED' },
  })

  if (!preference?.emailEnabled) return

  const safeGuestName = escapeHtml(booking.guestName)
  const safeError = escapeHtml(errorMessage)

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: 'Payment Failed - Grizzly Getaway',
      html: `
        <h1>Payment Failed</h1>
        <p>A payment attempt has failed:</p>
        <ul>
          <li><strong>Guest:</strong> ${safeGuestName}</li>
          <li><strong>Email:</strong> ${booking.guestEmail}</li>
          <li><strong>Amount:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
          <li><strong>Error:</strong> ${safeError}</li>
        </ul>
        <p>The guest may retry the payment or contact support.</p>
      `,
    })

    await logNotification('PAYMENT_FAILED', ownerEmail, 'email', 'Payment Failed', 'sent')
  } catch (error) {
    await logNotification(
      'PAYMENT_FAILED',
      ownerEmail,
      'email',
      'Payment Failed',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export const sendQuoteReceived = async (job: JobInfo, quote: QuoteInfo, ownerEmail: string) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'MAINTENANCE_QUOTE_RECEIVED' },
  })

  if (!preference?.emailEnabled) return

  const safeTitle = escapeHtml(job.title)
  const safeDescription = quote.description ? escapeHtml(quote.description) : 'No description'

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `Quote Received: ${safeTitle} - Grizzly Getaway`,
      html: `
        <h1>New Quote Received</h1>
        <p>A contractor has submitted a quote for your maintenance job:</p>
        <h2>${safeTitle}</h2>
        <ul>
          <li><strong>Quote Amount:</strong> $${quote.amount.toFixed(2)}</li>
          <li><strong>Estimated Time:</strong> ${quote.estimatedDays ?? 'Not specified'} days</li>
          <li><strong>Description:</strong> ${safeDescription}</li>
        </ul>
        <p><a href="${process.env.AUTH_URL ?? 'http://localhost:3000'}/owner/maintenance/${job.id}">Review Quote</a></p>
      `,
    })

    await logNotification(
      'MAINTENANCE_QUOTE_RECEIVED',
      ownerEmail,
      'email',
      'Quote Received',
      'sent'
    )
  } catch (error) {
    await logNotification(
      'MAINTENANCE_QUOTE_RECEIVED',
      ownerEmail,
      'email',
      'Quote Received',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export const sendMaintenanceCompleted = async (
  job: JobInfo,
  completion: CompletionInfo,
  ownerEmail: string
) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { event: 'MAINTENANCE_COMPLETED' },
  })

  if (!preference?.emailEnabled) return

  const safeTitle = escapeHtml(job.title)
  const safeDescription = completion.description
    ? escapeHtml(completion.description)
    : 'No notes provided'

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `Work Completed: ${safeTitle} - Grizzly Getaway`,
      html: `
        <h1>Maintenance Work Completed</h1>
        <p>A maintenance job has been marked as complete:</p>
        <h2>${safeTitle}</h2>
        <ul>
          <li><strong>Final Amount:</strong> $${completion.finalAmount ? completion.finalAmount.toFixed(2) : 'Not specified'}</li>
          <li><strong>Completion Notes:</strong> ${safeDescription}</li>
        </ul>
        <p><a href="${process.env.AUTH_URL ?? 'http://localhost:3000'}/owner/maintenance/${job.id}">View Details</a></p>
      `,
    })

    await logNotification(
      'MAINTENANCE_COMPLETED',
      ownerEmail,
      'email',
      'Maintenance Completed',
      'sent'
    )
  } catch (error) {
    await logNotification(
      'MAINTENANCE_COMPLETED',
      ownerEmail,
      'email',
      'Maintenance Completed',
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
  error?: string,
  body?: string
) => {
  await prisma.notificationLog.create({
    data: {
      event,
      recipient,
      channel,
      subject,
      status,
      error,
      body,
    },
  })
}
