import type { GalleryUploadTokenPayload } from '@/lib/gallery-token'

// Mock modules
vi.mock('@vercel/blob/client', () => ({
  handleUpload: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/gallery-token', () => ({
  verifyGalleryUploadToken: vi.fn(),
  GALLERY_CATEGORIES: [
    'Exterior',
    'Bedrooms',
    'Kitchen',
    'Bathrooms',
    'Living Areas',
    'Outdoors',
    'Amenities',
  ],
}))

// Import after mocks
const { POST } = await import('@/app/api/upload/gallery/route')
const { handleUpload } = await import('@vercel/blob/client')
const { auth } = await import('@/lib/auth')
const { verifyGalleryUploadToken } = await import('@/lib/gallery-token')

function createUploadRequest(clientPayload: string | null = null): Request {
  return new Request('http://localhost/api/upload/gallery', {
    method: 'POST',
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'test.jpg',
        callbackUrl: 'http://localhost/api/upload/gallery',
        clientPayload,
        multipart: false,
      },
    }),
  })
}

describe('Gallery Upload API Route', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(handleUpload).mockReset()
    vi.mocked(verifyGalleryUploadToken).mockReset()
  })

  describe('owner auth (session-based)', () => {
    it('should allow upload when user has OWNER role', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'owner-1', role: 'OWNER', email: 'owner@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      let capturedTokenPayload: string | undefined
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        const result = await onBeforeGenerateToken!('test.jpg', null)
        capturedTokenPayload = result.tokenPayload as string
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      const response = await POST(createUploadRequest())
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.clientToken).toBe('mock-token')
      expect(handleUpload).toHaveBeenCalledOnce()
      expect(capturedTokenPayload).toBeDefined()

      const parsed = JSON.parse(capturedTokenPayload!)
      expect(parsed.uploadedBy).toBe('OWNER')
      expect(parsed.bookingId).toBeNull()
    })
  })

  describe('guest auth (JWT-based)', () => {
    it('should allow upload with valid guest JWT in clientPayload', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const mockPayload: GalleryUploadTokenPayload = {
        bookingId: 'booking-123',
        guestName: 'Test Guest',
        guestEmail: 'guest@test.com',
      }
      vi.mocked(verifyGalleryUploadToken).mockResolvedValue(mockPayload)

      let capturedTokenPayload: string | undefined
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        const result = await onBeforeGenerateToken!('test.jpg', 'valid-jwt-token')
        capturedTokenPayload = result.tokenPayload as string
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      const response = await POST(createUploadRequest('valid-jwt-token'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.clientToken).toBe('mock-token')
      expect(verifyGalleryUploadToken).toHaveBeenCalledWith('valid-jwt-token')

      const parsed = JSON.parse(capturedTokenPayload!)
      expect(parsed.uploadedBy).toBe('GUEST')
      expect(parsed.bookingId).toBe('booking-123')
    })
  })

  describe('unauthorized access', () => {
    it('should return 400 when no session and no clientPayload', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken!('test.jpg', null)
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      const response = await POST(createUploadRequest())
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when clientPayload JWT is invalid', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      vi.mocked(verifyGalleryUploadToken).mockRejectedValue(new Error('Invalid token'))
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken!('test.jpg', 'invalid-jwt')
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      const response = await POST(createUploadRequest('invalid-jwt'))
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when session has non-OWNER role without JWT', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'guest-1', role: 'GUEST', email: 'guest@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken!('test.jpg', null)
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      const response = await POST(createUploadRequest())
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('tokenPayload content', () => {
    it('should set tokenPayload with OWNER uploadedBy and null bookingId for owner', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'owner-1', role: 'OWNER', email: 'owner@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      let tokenPayloadResult: string | undefined
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        const result = await onBeforeGenerateToken!('test.jpg', null)
        tokenPayloadResult = result.tokenPayload as string
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      await POST(createUploadRequest())

      const parsed = JSON.parse(tokenPayloadResult!)
      expect(parsed).toEqual({
        uploadedBy: 'OWNER',
        bookingId: null,
      })
    })

    it('should set tokenPayload with GUEST uploadedBy and bookingId for guest', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      vi.mocked(verifyGalleryUploadToken).mockResolvedValue({
        bookingId: 'booking-456',
        guestName: 'Jane Doe',
        guestEmail: 'jane@test.com',
      })

      let tokenPayloadResult: string | undefined
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        const result = await onBeforeGenerateToken!('test.jpg', 'valid-jwt')
        tokenPayloadResult = result.tokenPayload as string
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      await POST(createUploadRequest('valid-jwt'))

      const parsed = JSON.parse(tokenPayloadResult!)
      expect(parsed).toEqual({
        uploadedBy: 'GUEST',
        bookingId: 'booking-456',
      })
    })
  })

  describe('upload configuration', () => {
    it('should return correct content types and size limits', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'owner-1', role: 'OWNER', email: 'owner@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      let capturedResult: Record<string, unknown> | undefined
      vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
        capturedResult = (await onBeforeGenerateToken!('test.jpg', null)) as Record<string, unknown>
        return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
      })

      await POST(createUploadRequest())

      expect(capturedResult).toMatchObject({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 10 * 1024 * 1024,
        addRandomSuffix: true,
      })
    })
  })
})
