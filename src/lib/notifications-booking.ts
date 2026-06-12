// Booking-lifecycle notifications for alt-payment Holds, family bookings, and
// the checkout-day email (ADR 0001). Lives apart from notifications.ts to keep
// both modules under the file-size cap; shares its logNotification sink.

import { Resend } from 'resend'
import { format } from 'date-fns'
import type { Booking } from '@prisma/client'
import { escapeHtml } from './security'
import { env } from './env'
import { logNotification } from './notifications'
import { signPaymentClaimToken } from './payment-claim-token'
import { signReviewToken } from './review-token'
import { PAYMENT_METHOD_INFO } from './payment-methods'

const getResend = () => new Resend(env().AUTH_RESEND_KEY)

const appUrl = () => env().NEXT_PUBLIC_APP_URL ?? env().AUTH_URL ?? 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Hold created — guest confirmation with payment instructions + claim link
// ---------------------------------------------------------------------------

export const sendHoldCreatedGuest = async (booking: Booking) => {
  const token = await signPaymentClaimToken({
    bookingId: booking.id,
    guestEmail: booking.guestEmail,
  })

  const claimUrl = `${appUrl()}/booking/${booking.id}?token=${token}`
  const method = PAYMENT_METHOD_INFO[booking.paymentMethod]
  const safeGuestName = escapeHtml(booking.guestName)
  const checkInFormatted = format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')
  const holdExpiry = booking.holdExpiresAt
    ? format(new Date(booking.holdExpiresAt), "EEEE, MMMM d 'at' h:mm a")
    : 'in 24 hours'

  const paymentInstructions =
    booking.paymentMethod === 'CONTACT_OWNER'
      ? '<p>The owner has received your message and will get back to you about payment.</p>'
      : `<p>To confirm your booking, send <strong>$${Number(booking.totalAmount).toFixed(2)}</strong>
         via <strong>${method.name}</strong> to <strong>${escapeHtml(method.handle)}</strong>.
         Include your name and dates in the payment note.</p>`

  try {
    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: booking.guestEmail,
      subject: 'Your dates are held - Grizzly Getaway',
      html: `
        <h1>Your Dates Are Held!</h1>
        <p>Hello ${safeGuestName},</p>
        <p>We're holding the cabin for you until <strong>${holdExpiry}</strong>:</p>
        <ul>
          <li><strong>Check-in:</strong> ${checkInFormatted}</li>
          <li><strong>Check-out:</strong> ${checkOutFormatted}</li>
          <li><strong>Total:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
        </ul>
        ${paymentInstructions}
        <p>Once you've sent the payment, let us know:</p>
        <p><a href="${claimUrl}" style="display:inline-block; padding:12px 24px; background-color:#447a52; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
          I've Sent the Payment
        </a></p>
        <p>The owner will verify the funds and confirm your booking. If the hold expires
        before payment arrives, the dates open back up and you'll need to re-book.</p>
      `,
    })

    await logNotification('HOLD_CREATED', booking.guestEmail, 'email', 'Dates Held', 'sent')
  } catch (error) {
    await logNotification(
      'HOLD_CREATED',
      booking.guestEmail,
      'email',
      'Dates Held',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// ---------------------------------------------------------------------------
// Hold created — owner alert
// ---------------------------------------------------------------------------

export const sendHoldCreatedOwner = async (booking: Booking, inquiryMessage?: string) => {
  const ownerEmail = env().OWNER_EMAIL
  const method = PAYMENT_METHOD_INFO[booking.paymentMethod]
  const safeGuestName = escapeHtml(booking.guestName)
  const checkInFormatted = format(new Date(booking.checkIn), 'MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'MMMM d, yyyy')

  try {
    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: ownerEmail,
      subject: `New ${method.name} hold - Grizzly Getaway`,
      html: `
        <h1>New Booking Hold</h1>
        <ul>
          <li><strong>Guest:</strong> ${safeGuestName} (${escapeHtml(booking.guestEmail)})</li>
          <li><strong>Dates:</strong> ${checkInFormatted} &rarr; ${checkOutFormatted}</li>
          <li><strong>Guests:</strong> ${booking.numberOfGuests}</li>
          <li><strong>Total:</strong> $${Number(booking.totalAmount).toFixed(2)}</li>
          <li><strong>Payment method:</strong> ${method.name}</li>
        </ul>
        ${inquiryMessage ? `<p><strong>Guest message:</strong></p><blockquote>${escapeHtml(inquiryMessage)}</blockquote>` : ''}
        <p>Watch your ${method.name === 'Contact Owner' ? 'inbox' : method.name + ' account'} for
        the funds, then approve the booking to confirm it. The hold expires automatically
        after 24 hours if you don't.</p>
        <p><a href="${appUrl()}/owner/bookings">Review Bookings</a></p>
      `,
    })

    await logNotification('HOLD_CREATED', ownerEmail, 'email', 'New Booking Hold', 'sent')
  } catch (error) {
    await logNotification(
      'HOLD_CREATED',
      ownerEmail,
      'email',
      'New Booking Hold',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// ---------------------------------------------------------------------------
// Hold expired — guest notice
// ---------------------------------------------------------------------------

export const sendHoldExpired = async (booking: Booking) => {
  const safeGuestName = escapeHtml(booking.guestName)
  const checkInFormatted = format(new Date(booking.checkIn), 'MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'MMMM d, yyyy')

  try {
    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: booking.guestEmail,
      subject: 'Your hold has expired - Grizzly Getaway',
      html: `
        <h1>Hold Expired</h1>
        <p>Hello ${safeGuestName},</p>
        <p>The 24-hour hold on ${checkInFormatted} &rarr; ${checkOutFormatted} has expired
        because we couldn't verify your payment in time, so the dates have opened back up.</p>
        <p>If you still want to stay with us, you're welcome to
        <a href="${appUrl()}/book">book again</a> — or reply to this email if your payment
        is already on its way and we'll sort it out.</p>
      `,
    })

    await logNotification('BOOKING_CANCELLED', booking.guestEmail, 'email', 'Hold Expired', 'sent')
  } catch (error) {
    await logNotification(
      'BOOKING_CANCELLED',
      booking.guestEmail,
      'email',
      'Hold Expired',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// ---------------------------------------------------------------------------
// Family booking created — owner alert
// ---------------------------------------------------------------------------

export const sendFamilyBookingCreated = async (booking: Booking) => {
  const ownerEmail = env().OWNER_EMAIL
  const safeGuestName = escapeHtml(booking.guestName)
  const checkInFormatted = format(new Date(booking.checkIn), 'MMMM d, yyyy')
  const checkOutFormatted = format(new Date(booking.checkOut), 'MMMM d, yyyy')

  try {
    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: ownerEmail,
      subject: 'New family booking - Grizzly Getaway',
      html: `
        <h1>New Family Booking</h1>
        <p><strong>${safeGuestName}</strong> (${escapeHtml(booking.guestEmail)}) booked the cabin
        as a family member — auto-confirmed, no payment.</p>
        <ul>
          <li><strong>Check-in:</strong> ${checkInFormatted}</li>
          <li><strong>Check-out:</strong> ${checkOutFormatted}</li>
          <li><strong>Guests:</strong> ${booking.numberOfGuests}</li>
        </ul>
        <p><a href="${appUrl()}/owner/bookings">Review Bookings</a></p>
      `,
    })

    await logNotification(
      'FAMILY_BOOKING_CREATED',
      ownerEmail,
      'email',
      'New Family Booking',
      'sent'
    )
  } catch (error) {
    await logNotification(
      'FAMILY_BOOKING_CREATED',
      ownerEmail,
      'email',
      'New Family Booking',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// ---------------------------------------------------------------------------
// Checkout-day thanks — wrap-up info + first review invite
// ---------------------------------------------------------------------------

export const sendCheckoutThanks = async (booking: Booking) => {
  const token = await signReviewToken({
    bookingId: booking.id,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
  })

  const reviewUrl = `${appUrl()}/review?token=${token}`
  const safeGuestName = escapeHtml(booking.guestName)

  try {
    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: booking.guestEmail,
      subject: 'Thanks for staying with us - Grizzly Getaway',
      html: `
        <h1>Thanks for Staying With Us!</h1>
        <p>Hello ${safeGuestName},</p>
        <p>We hope you had a wonderful time at the cabin. A few wrap-up notes:</p>
        <ul>
          <li>The door code deactivates at 11:00 AM — no need to do anything on your end.</li>
          <li>Left something behind? Reply to this email and we'll check the lost &amp; found.</li>
          <li>No cleaning required beyond loading the dishwasher and bagging trash.</li>
        </ul>
        <p>If you have a minute, we'd love to hear how your stay went:</p>
        <p><a href="${reviewUrl}" style="display:inline-block; padding:12px 24px; background-color:#447a52; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
          Leave a Review
        </a></p>
        <p>This link is valid for 14 days. Thank you for being a wonderful guest!</p>
      `,
    })

    await logNotification(
      'GUEST_CHECKOUT_THANKS',
      booking.guestEmail,
      'email',
      'Checkout Thanks',
      'sent'
    )
  } catch (error) {
    await logNotification(
      'GUEST_CHECKOUT_THANKS',
      booking.guestEmail,
      'email',
      'Checkout Thanks',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
