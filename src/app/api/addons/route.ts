import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const GET = async () => {
  try {
    const addons = await prisma.addon.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
    })

    const formattedAddons = addons.map((addon) => ({
      ...addon,
      price: Number(addon.price),
    }))

    return NextResponse.json(formattedAddons)
  } catch (error) {
    console.error('Error fetching addons:', error)
    return NextResponse.json([], { status: 500 })
  }
}
