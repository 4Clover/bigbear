import { type NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import {
  sendBookingConfirmation,
  sendPaymentReceived,
  sendPaymentFailed,
  sendBookingFailedRefund,
} from '@/lib/notifications'
import { isDateRangeAvailable } from '@/lib/utils/calendar'
import { type Stripe } from 'stripe'

const OWNER_EMAIL = env().OWNER_EMAIL

interface AddonMetadata {
  id: string
  quantity: number
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const metadata = session.metadata

    if (!metadata) {
      console.error('Checkout session missing metadata')
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 })
    }

    // Validate required metadata fields
    const {
      guestEmail,
      guestName,
      guestPhone,
      checkIn,
      checkOut,
      basePrice,
      addonsTotal,
      depositAmount,
      totalAmount,
      addons: addonsJson,
    } = metadata

    if (
      !guestEmail ||
      !guestName ||
      !checkIn ||
      !checkOut ||
      !basePrice ||
      !addonsTotal ||
      !depositAmount ||
      !totalAmount
    ) {
      console.error('Checkout session missing required metadata fields')
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 })
    }

    // Verify price consistency between checkout and payment
    // This prevents issues if pricing changed between checkout creation and payment completion
    const storedTotal = parseFloat(totalAmount) + parseFloat(depositAmount)
    const paidAmount = (session.amount_total ?? 0) / 100
    const priceDifference = Math.abs(storedTotal - paidAmount)

    if (priceDifference > 0.01) {
      console.error('Price mismatch detected', {
        storedTotal,
        paidAmount,
        difference: priceDifference,
        sessionId: session.id,
      })
      // Log but don't reject - the payment already succeeded, so we honor the paid amount
      // This provides visibility into any pricing race conditions
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const paymentIntentId = session.payment_intent as string

    // Use transaction for atomic availability check and booking creation
    try {
      const booking = await prisma.$transaction(async (tx) => {
        // Check availability within transaction to prevent race conditions
        const [existingBookings, blockedDates] = await Promise.all([
          tx.booking.findMany({
            where: { status: { in: ['CONFIRMED', 'PENDING'] } },
            select: { checkIn: true, checkOut: true },
          }),
          tx.blockedDate.findMany({
            select: { startDate: true, endDate: true },
          }),
        ])

        if (!isDateRangeAvailable(checkInDate, checkOutDate, existingBookings, blockedDates)) {
          throw new Error('DATES_UNAVAILABLE')
        }

        // Create or get guest user
        let user = await tx.user.findUnique({
          where: { email: guestEmail },
        })

        user ??= await tx.user.create({
          data: {
            email: guestEmail,
            name: guestName,
            phone: guestPhone ?? null,
            role: 'GUEST',
          },
        })

        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            guestId: user.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guestName: guestName,
            guestEmail: guestEmail,
            guestPhone: guestPhone ?? null,
            basePrice: parseFloat(basePrice),
            addonsTotal: parseFloat(addonsTotal),
            depositAmount: parseFloat(depositAmount),
            totalAmount: parseFloat(totalAmount),
            paymentIntentId,
            status: 'CONFIRMED',
          },
        })

        // Create booking addons
        const addons = JSON.parse(addonsJson ?? '[]') as AddonMetadata[]
        for (const addon of addons) {
          const addonData = await tx.addon.findUnique({ where: { id: addon.id } })
          if (addonData) {
            await tx.bookingAddon.create({
              data: {
                bookingId: newBooking.id,
                addonId: addon.id,
                quantity: addon.quantity,
                price: addonData.price,
              },
            })
          }
        }

        // Log income transaction
        const incomeCategory = await tx.expenseCategory.findFirst({
          where: { name: 'Rental Income' },
        })

        if (incomeCategory) {
          await tx.transaction.create({
            data: {
              type: 'INCOME',
              categoryId: incomeCategory.id,
              amount: parseFloat(totalAmount),
              date: new Date(),
              description: `Booking #${newBooking.id.slice(-6)}`,
              bookingId: newBooking.id,
            },
          })
        }

        return newBooking
      })

      // Send notifications (guest confirmation + owner notification)
      await sendBookingConfirmation(booking)
      sendPaymentReceived(booking, OWNER_EMAIL).catch(() => {
        // Owner notification failure should not affect webhook response
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'DATES_UNAVAILABLE') {
        // Dates are no longer available - issue refund
        console.error('Double-booking prevented: dates no longer available, issuing refund')

        await stripe.refunds.create({ payment_intent: paymentIntentId })

        // Notify guest about the issue and refund
        await sendBookingFailedRefund({
          guestEmail,
          guestName,
          checkIn,
          checkOut,
        })

        return NextResponse.json(
          { error: 'Dates no longer available - refund issued' },
          { status: 409 }
        )
      }
      throw error
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    const errorMessage = paymentIntent.last_payment_error?.message ?? 'Unknown payment error'

    // Try to find associated booking via metadata
    const bookingId = paymentIntent.metadata.bookingId
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      })

      if (booking) {
        sendPaymentFailed(booking, OWNER_EMAIL, errorMessage).catch(() => {
          // Owner notification failure should not affect webhook response
        })
      }
    }

    console.error('Payment failed:', errorMessage)
  }

  return NextResponse.json({ received: true })
}
