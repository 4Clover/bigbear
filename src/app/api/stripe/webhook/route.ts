import { type NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation, sendPaymentReceived, sendPaymentFailed } from '@/lib/notifications'
import { type Stripe } from 'stripe'

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@example.com'

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

    // Create or get guest user
    let user = await prisma.user.findUnique({
      where: { email: guestEmail },
    })

    user ??= await prisma.user.create({
      data: {
        email: guestEmail,
        name: guestName,
        phone: guestPhone ?? null,
        role: 'GUEST',
      },
    })

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        guestId: user.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestName: guestName,
        guestEmail: guestEmail,
        guestPhone: guestPhone ?? null,
        basePrice: parseFloat(basePrice),
        addonsTotal: parseFloat(addonsTotal),
        depositAmount: parseFloat(depositAmount),
        totalAmount: parseFloat(totalAmount),
        paymentIntentId: session.payment_intent as string,
        status: 'CONFIRMED',
      },
    })

    // Create booking addons
    const addons = JSON.parse(addonsJson ?? '[]') as AddonMetadata[]
    for (const addon of addons) {
      const addonData = await prisma.addon.findUnique({ where: { id: addon.id } })
      if (addonData) {
        await prisma.bookingAddon.create({
          data: {
            bookingId: booking.id,
            addonId: addon.id,
            quantity: addon.quantity,
            price: addonData.price,
          },
        })
      }
    }

    // Log income transaction
    const incomeCategory = await prisma.expenseCategory.findFirst({
      where: { name: 'Rental Income' },
    })

    if (incomeCategory) {
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          categoryId: incomeCategory.id,
          amount: parseFloat(totalAmount),
          date: new Date(),
          description: `Booking #${booking.id.slice(-6)}`,
          bookingId: booking.id,
        },
      })
    }

    // Send notifications (guest confirmation + owner notification)
    await sendBookingConfirmation(booking)
    sendPaymentReceived(booking, OWNER_EMAIL).catch(() => {
      // Owner notification failure should not affect webhook response
    })
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
