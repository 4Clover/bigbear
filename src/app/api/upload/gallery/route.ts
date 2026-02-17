import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyGalleryUploadToken } from '@/lib/gallery-token'
import type { GalleryUploadTokenPayload } from '@/lib/gallery-token'

export const POST = async (request: Request): Promise<NextResponse> => {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth()
        let isOwner = false
        let guestPayload: GalleryUploadTokenPayload | null = null

        if (session?.user?.role === 'OWNER') {
          isOwner = true
        } else if (clientPayload) {
          try {
            guestPayload = await verifyGalleryUploadToken(clientPayload)
          } catch {
            throw new Error('Unauthorized')
          }
        } else {
          throw new Error('Unauthorized')
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            uploadedBy: isOwner ? 'OWNER' : 'GUEST',
            bookingId: guestPayload?.bookingId ?? null,
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Gallery image uploaded:', blob.url)
        await Promise.resolve()
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
