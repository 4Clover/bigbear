import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiUnauthorized } from '@/lib/api-response'

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth()
  if (!session?.user || !['OWNER', 'WORKER'].includes(session.user.role)) {
    return apiUnauthorized()
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: () =>
        Promise.resolve({
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB limit
          addRandomSuffix: true,
        }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Maintenance photo uploaded:', blob.url)
        await Promise.resolve()
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
