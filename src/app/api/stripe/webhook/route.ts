import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation } from '@/lib/notifications'
import type Stripe from 'stripe'

interface AddonMetadata {
  id: string
  quantity: number
}

export const POST = async (request: NextRequest) => {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata!

    // Create or get guest user
    let user = await prisma.user.findUnique({
      where: { email: metadata.guestEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: metadata.guestEmail,
          name: metadata.guestName,
          phone: metadata.guestPhone || null,
          role: 'GUEST',
        },
      })
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        guestId: user.id,
        checkIn: new Date(metadata.checkIn),
        checkOut: new Date(metadata.checkOut),
        guestName: metadata.guestName,
        guestEmail: metadata.guestEmail,
        guestPhone: metadata.guestPhone || null,
        basePrice: parseFloat(metadata.basePrice),
        addonsTotal: parseFloat(metadata.addonsTotal),
        depositAmount: parseFloat(metadata.depositAmount),
        totalAmount: parseFloat(metadata.totalAmount),
        paymentIntentId: session.payment_intent as string,
        status: 'CONFIRMED',
      },
    })

    // Create booking addons
    const addons = JSON.parse(metadata.addons || '[]') as AddonMetadata[]
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
          amount: parseFloat(metadata.totalAmount),
          date: new Date(),
          description: `Booking #${booking.id.slice(-6)}`,
          bookingId: booking.id,
        },
      })
    }

    // Send confirmation email
    await sendBookingConfirmation(booking)
  }

  return NextResponse.json({ received: true })
}
