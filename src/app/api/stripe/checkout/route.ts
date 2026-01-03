import { type NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

interface AddonRequest {
  id: string
  quantity: number
}

interface CheckoutRequestBody {
  checkIn: string
  checkOut: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  addons?: AddonRequest[]
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = (await request.json()) as CheckoutRequestBody
    const { checkIn, checkOut, guestName, guestEmail, guestPhone, addons = [] } = body

    // Get pricing config
    const pricing = await prisma.pricingConfig.findFirst()
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not configured' }, { status: 500 })
    }

    // Calculate nights and base price
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    )
    const basePrice = Number(pricing.baseNightlyRate) * nights + Number(pricing.cleaningFee)

    // Calculate addons
    let addonsTotal = 0
    const addonItems = await prisma.addon.findMany({
      where: { id: { in: addons.map((a) => a.id) } },
    })
    for (const addon of addons) {
      const addonData = addonItems.find((a) => a.id === addon.id)
      if (addonData) {
        addonsTotal += Number(addonData.price) * addon.quantity
      }
    }

    const totalAmount = basePrice + addonsTotal
    const depositAmount = totalAmount * (pricing.depositPercentage / 100)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round((totalAmount + depositAmount) * 100),
            product_data: {
              name: `Cabin Rental: ${nights} night${nights > 1 ? 's' : ''}`,
              description: `Check-in: ${checkIn}, Check-out: ${checkOut}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        checkIn,
        checkOut,
        guestName,
        guestEmail,
        guestPhone: guestPhone ?? '',
        basePrice: basePrice.toString(),
        addonsTotal: addonsTotal.toString(),
        depositAmount: depositAmount.toString(),
        totalAmount: totalAmount.toString(),
        addons: JSON.stringify(addons),
      },
      customer_email: guestEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
