import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const GET = async (): Promise<NextResponse> => {
  try {
    const pricing = await prisma.pricingConfig.findFirst()

    if (!pricing) {
      return NextResponse.json({
        baseNightlyRate: 150,
        cleaningFee: 75,
        depositPercentage: 20,
        minNights: 2,
        maxNights: 14,
      })
    }

    return NextResponse.json({
      baseNightlyRate: Number(pricing.baseNightlyRate),
      weekendRate: pricing.weekendRate ? Number(pricing.weekendRate) : null,
      cleaningFee: Number(pricing.cleaningFee),
      depositPercentage: pricing.depositPercentage,
      minNights: pricing.minNights,
      maxNights: pricing.maxNights,
      maxGuests: pricing.maxGuests,
    })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      {
        baseNightlyRate: 150,
        cleaningFee: 75,
        depositPercentage: 20,
        minNights: 2,
        maxNights: 14,
      },
      { status: 500 }
    )
  }
}
