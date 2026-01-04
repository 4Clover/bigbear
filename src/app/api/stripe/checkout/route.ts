import { type NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

// Zod schema for checkout request validation
const AddonSchema = z.object({
  id: z.string().min(1, 'Addon ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
})

const CheckoutRequestSchema = z.object({
  checkIn: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid check-in date format'),
  checkOut: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid check-out date format'),
  guestName: z.string().min(1, 'Guest name is required').max(100, 'Guest name too long'),
  guestEmail: z.email('Invalid email address'),
  guestPhone: z
    .string()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  addons: z.array(AddonSchema).default([]),
})

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // Check rate limit
  const clientId = getClientIdentifier(request)
  const rateLimitResult = await checkRateLimit(`checkout:${clientId}`, RATE_LIMITS.checkout)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMITS.checkout.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    )
  }

  try {
    const rawBody: unknown = await request.json()

    // Validate request body with Zod
    const parseResult = CheckoutRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    const { checkIn, checkOut, guestName, guestEmail, guestPhone, addons } = parseResult.data

    // Additional business logic validation
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json({ error: 'Check-in date cannot be in the past' }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      )
    }

    // Get pricing config
    const pricing = await prisma.pricingConfig.findFirst()
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not configured' }, { status: 500 })
    }

    // Calculate nights and validate against limits
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (nights < pricing.minNights) {
      return NextResponse.json(
        { error: `Minimum stay is ${pricing.minNights} nights` },
        { status: 400 }
      )
    }

    if (nights > pricing.maxNights) {
      return NextResponse.json(
        { error: `Maximum stay is ${pricing.maxNights} nights` },
        { status: 400 }
      )
    }

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
