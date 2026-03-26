import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { escapeHtml } from '@/lib/security'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { env } from '@/lib/env'

const resend = new Resend(env().AUTH_RESEND_KEY)

const inquirySchema = z.object({
  guestName: z.string().min(1).max(100),
  guestEmail: z.email(),
  guestPhone: z.string().max(30).optional().or(z.literal('')),
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d))),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d))),
  totalAmount: z.number().positive(),
  message: z.string().min(1).max(2000),
})

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const clientId = getClientIdentifier(request)
  const rateLimitResult = await checkRateLimit(`booking-inquiry:${clientId}`, RATE_LIMITS.contact)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const rawBody: unknown = await request.json()
    const result = inquirySchema.safeParse(rawBody)

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { guestName, guestEmail, guestPhone, checkIn, checkOut, totalAmount, message } =
      result.data

    const safeName = escapeHtml(guestName)
    const safeEmail = escapeHtml(guestEmail)
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
    const formattedCheckIn = new Date(checkIn).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const formattedCheckOut = new Date(checkOut).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Send to owner
    await resend.emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: env().OWNER_EMAIL,
      replyTo: guestEmail,
      subject: `Booking Inquiry from ${guestName}`,
      html: `
        <h2>Booking Payment Inquiry</h2>
        <p><strong>Guest:</strong> ${safeName} (${safeEmail})</p>
        ${guestPhone ? `<p><strong>Phone:</strong> ${escapeHtml(guestPhone)}</p>` : ''}
        <p><strong>Dates:</strong> ${formattedCheckIn} &rarr; ${formattedCheckOut}</p>
        <p><strong>Total:</strong> $${totalAmount.toFixed(2)}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 3px solid #447a52; padding-left: 16px; margin-left: 0;">
          ${safeMessage}
        </blockquote>
      `,
    })

    // Send confirmation to guest
    await resend.emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: guestEmail,
      subject: 'Your booking inquiry - Grizzly Getaway',
      html: `
        <h2>We received your inquiry!</h2>
        <p>Hello ${safeName},</p>
        <p>Thank you for your interest in booking with Grizzly Getaway. The owner will review your inquiry and respond soon.</p>
        <p><strong>Booking details:</strong></p>
        <ul>
          <li>Check-in: ${formattedCheckIn}</li>
          <li>Check-out: ${formattedCheckOut}</li>
          <li>Total: $${totalAmount.toFixed(2)}</li>
        </ul>
        <p>Best regards,<br>Grizzly Getaway</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Booking inquiry error:', error)
    return NextResponse.json({ error: 'Failed to send inquiry' }, { status: 500 })
  }
}
