import { type NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
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
  price?: number
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = env().STRIPE_WEBHOOK_SECRET
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

  console.log('[WEBHOOK]', {
    event: 'webhook_received',
    eventId: event.id,
    eventType: event.type,
    timestamp: new Date().toISOString(),
  })

  const existingEvent = await prisma.stripeEvent.findUnique({ where: { id: event.id } })
  if (existingEvent && existingEvent.status !== 'pending') {
    return NextResponse.json({ received: true, skipped: true })
  }

  await prisma.stripeEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type, status: 'processing' },
    update: { status: 'processing' },
  })

  const markEventProcessed = async () => {
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: { status: 'processed', processedAt: new Date() },
    })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const metadata = session.metadata

      if (!metadata) {
        console.error('Checkout session missing metadata')
        await markEventProcessed()
        return NextResponse.json({ received: true, skipped: true })
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
        await markEventProcessed()
        return NextResponse.json({ received: true, skipped: true })
      }

      // Verify price consistency between checkout and payment
      // This prevents issues if pricing changed between checkout creation and payment completion
      const storedTotal = parseFloat(totalAmount) + parseFloat(depositAmount)
      const paidAmount = (session.amount_total ?? 0) / 100
      const priceDifference = Math.abs(storedTotal - paidAmount)
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

      if (priceDifference > 0.01) {
        console.log('[WEBHOOK]', {
          event: 'amount_mismatch',
          storedTotal,
          paidAmount,
          difference: priceDifference,
          sessionId: session.id,
        })

        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId })
        } else {
          console.log('[WEBHOOK]', {
            event: 'refund_skipped_missing_payment_intent',
            sessionId: session.id,
          })
        }

        await markEventProcessed()
        return NextResponse.json({ received: true, refunded: Boolean(paymentIntentId) })
      }

      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      console.log('[WEBHOOK]', {
        event: 'booking_creation_initiated',
        guestEmail,
        checkIn,
        checkOut,
        basePrice: parseFloat(basePrice),
        addonsTotal: parseFloat(addonsTotal),
        depositAmount: parseFloat(depositAmount),
        totalAmount: parseFloat(totalAmount),
        paymentIntentId: paymentIntentId ?? 'missing',
      })

      if (!paymentIntentId) {
        console.log('[WEBHOOK]', {
          event: 'missing_payment_intent',
          sessionId: session.id,
        })
        await markEventProcessed()
        return NextResponse.json({ received: true, skipped: true })
      }

      // Use transaction for atomic availability check and booking creation
      try {
        const transactionResult = await prisma.$transaction(async (tx) => {
          const existingBooking = await tx.booking.findUnique({
            where: { paymentIntentId: session.payment_intent as string },
          })
          if (existingBooking) {
            return { booking: existingBooking, skipped: true as const }
          }

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
          const addonIds = addons.map((addon) => addon.id)
          const addonDataList = await tx.addon.findMany({ where: { id: { in: addonIds } } })
          const addonMap = new Map(addonDataList.map((addon) => [addon.id, addon]))

          for (const addon of addons) {
            const addonData = addonMap.get(addon.id)

            if (addonData) {
              await tx.bookingAddon.create({
                data: {
                  bookingId: newBooking.id,
                  addonId: addon.id,
                  quantity: addon.quantity,
                  price: addonData.price,
                },
              })
              continue
            }

            console.log('[WEBHOOK]', { event: 'addon_not_found', addonId: addon.id })

            await tx.bookingAddon.create({
              data: {
                bookingId: newBooking.id,
                addonId: addon.id,
                quantity: addon.quantity,
                price: addon.price ?? 0,
              },
            })
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

          return { booking: newBooking, skipped: false as const }
        })

        if (transactionResult.skipped) {
          await markEventProcessed()
          return NextResponse.json({ received: true, skipped: true })
        }

        const booking = transactionResult.booking

        // Send notifications (guest confirmation + owner notification)
        void sendBookingConfirmation(booking).catch(() => { /* non-blocking */ })
        sendPaymentReceived(booking, OWNER_EMAIL).catch(() => {
          /* non-blocking */
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2010' &&
          error.message.includes('booking_no_date_overlap')
        ) {
          console.log('[WEBHOOK]', {
            event: 'booking_overlap_rejected',
            sessionId: session.id,
            paymentIntentId,
          })

          await markEventProcessed()
          return NextResponse.json(
            { received: true, error: 'Booking dates overlap' },
            { status: 200 }
          )
        }

        if (error instanceof Error && error.message === 'DATES_UNAVAILABLE') {
          // Dates are no longer available - issue refund
          console.error('Double-booking prevented: dates no longer available, issuing refund')
          console.log('[WEBHOOK]', {
            event: 'availability_conflict_detected',
            guestEmail,
            checkIn,
            checkOut,
            paymentIntentId,
            action: 'refund_issued',
          })

          await stripe.refunds.create({ payment_intent: paymentIntentId })

          // Notify guest about the issue and refund
          await sendBookingFailedRefund({
            guestEmail,
            guestName,
            checkIn,
            checkOut,
          })

          await markEventProcessed()
          return NextResponse.json({ received: true, skipped: true })
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

    await markEventProcessed()

    return NextResponse.json({ received: true })
  } catch (err) {
    await prisma.stripeEvent
      .update({
        where: { id: event.id },
        data: { status: 'pending' },
      })
      .catch(() => { /* non-blocking */ })
    throw err
  }
}
