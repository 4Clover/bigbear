'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { secureAction } from '@/lib/auth/secure-action'
import { verifyReviewToken } from '@/lib/review-token'
import { signReviewToken } from '@/lib/review-token'
import { invalidateReviews } from '@/lib/cache/invalidation'
import { Resend } from 'resend'
import { env } from '@/lib/env'

const resend = new Resend(env().AUTH_RESEND_KEY)

// ---------------------------------------------------------------------------
// Guest: submit a review (unauthenticated, token-gated)
// ---------------------------------------------------------------------------

const submitReviewSchema = z.object({
  token: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(5000),
  photoUrls: z.array(z.url()).max(3).default([]),
})

export const submitReview = async (input: z.infer<typeof submitReviewSchema>) => {
  const validated = submitReviewSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { token, rating, body, photoUrls } = validated.data

  let payload
  try {
    payload = await verifyReviewToken(token)
  } catch {
    return { success: false, error: 'Invalid or expired review link' }
  }

  // Check if review already exists for this booking
  const existing = await prisma.review.findUnique({
    where: { bookingId: payload.bookingId },
  })

  if (existing) {
    // Update existing review
    await prisma.review.update({
      where: { bookingId: payload.bookingId },
      data: { rating, body, photoUrls },
    })
  } else {
    // Create new review
    await prisma.review.create({
      data: {
        bookingId: payload.bookingId,
        guestName: payload.guestName,
        rating,
        body,
        photoUrls,
      },
    })
  }

  invalidateReviews()
  return { success: true }
}

// ---------------------------------------------------------------------------
// Owner: toggle review published status
// ---------------------------------------------------------------------------

export const toggleReviewPublished = secureAction(
  {
    roles: 'OWNER',
    schema: z.object({ reviewId: z.string().min(1) }),
  },
  async ({ data }) => {
    const review = await prisma.review.findUnique({
      where: { id: data.reviewId },
    })

    if (!review) {
      return { success: false, error: 'Review not found' }
    }

    await prisma.review.update({
      where: { id: data.reviewId },
      data: { isPublished: !review.isPublished },
    })

    invalidateReviews()
    return { success: true }
  }
)

// ---------------------------------------------------------------------------
// Owner: send review invite email
// ---------------------------------------------------------------------------

export const sendReviewInvite = secureAction(
  {
    roles: 'OWNER',
    schema: z.object({ bookingId: z.string().min(1) }),
  },
  async ({ data }) => {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { id: true, guestName: true, guestEmail: true, checkIn: true, checkOut: true },
    })

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    const token = await signReviewToken({
      bookingId: booking.id,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
    })

    const appUrl = env().NEXT_PUBLIC_APP_URL ?? ''
    const reviewUrl = `${appUrl}/review?token=${token}`

    const checkInDate = booking.checkIn.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const checkOutDate = booking.checkOut.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    await resend.emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: booking.guestEmail,
      subject: 'How was your stay? Leave a review - Grizzly Getaway',
      html: `
        <h2>We hope you loved your stay!</h2>
        <p>Hello ${booking.guestName},</p>
        <p>Thank you for staying with us at Grizzly Getaway (${checkInDate} - ${checkOutDate}).
        We'd love to hear about your experience!</p>
        <p><a href="${reviewUrl}" style="display:inline-block; padding:12px 24px; background-color:#447a52; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
          Leave a Review
        </a></p>
        <p>You can also share up to 3 photos from your stay.</p>
        <p style="color:#666; font-size:12px;">This link expires in 14 days.</p>
        <p>Best regards,<br>Grizzly Getaway</p>
      `,
    })

    return { success: true }
  }
)
