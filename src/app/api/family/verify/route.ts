import { NextResponse, type NextRequest } from 'next/server'
import { verifyFamilyToken } from '@/lib/family-token'

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string }

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    const payload = await verifyFamilyToken(token)
    return NextResponse.json({
      valid: true,
      name: payload.name,
      email: payload.email,
    })
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 })
  }
}
