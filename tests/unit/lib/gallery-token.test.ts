import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: () => ({ AUTH_SECRET: 'test-secret-at-least-32-characters-long' }),
}))

const { signGalleryUploadToken, verifyGalleryUploadToken, GALLERY_CATEGORIES } =
  await import('@/lib/gallery-token')

const validPayload = {
  bookingId: 'booking-abc',
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
}

describe('Gallery Token', () => {
  describe('GALLERY_CATEGORIES', () => {
    it('should contain exactly 7 categories', () => {
      expect(GALLERY_CATEGORIES).toHaveLength(7)
    })

    it('should contain the expected category values', () => {
      expect(GALLERY_CATEGORIES).toEqual([
        'Exterior',
        'Bedrooms',
        'Kitchen',
        'Bathrooms',
        'Living Areas',
        'Outdoors',
        'Amenities',
      ])
    })
  })

  describe('signGalleryUploadToken', () => {
    it('should return a JWT string with 3 dot-separated parts', async () => {
      const token = await signGalleryUploadToken(validPayload)

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyGalleryUploadToken', () => {
    it('should verify a freshly signed token and return correct payload', async () => {
      const token = await signGalleryUploadToken(validPayload)
      const result = await verifyGalleryUploadToken(token)

      expect(result.bookingId).toBe('booking-abc')
      expect(result.guestName).toBe('Jane Doe')
      expect(result.guestEmail).toBe('jane@example.com')
    })

    it('should throw for an invalid token string', async () => {
      await expect(verifyGalleryUploadToken('not.a.valid.jwt')).rejects.toThrow()
    })

    it('should throw for a completely malformed token', async () => {
      await expect(verifyGalleryUploadToken('garbage')).rejects.toThrow()
    })

    it('should throw for an expired token', async () => {
      vi.useFakeTimers()
      try {
        const token = await signGalleryUploadToken(validPayload)

        vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000)

        await expect(verifyGalleryUploadToken(token)).rejects.toThrow()
      } finally {
        vi.useRealTimers()
      }
    })

    it('should throw for a token signed with a different secret', async () => {
      const { SignJWT } = await import('jose')
      const wrongKey = new TextEncoder().encode('wrong-secret-at-least-32-chars-here!!')

      const badToken = await new SignJWT(validPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('gallery-upload')
        .setExpirationTime('30d')
        .sign(wrongKey)

      await expect(verifyGalleryUploadToken(badToken)).rejects.toThrow()
    })

    it('should throw for a token with wrong issuer', async () => {
      const { SignJWT } = await import('jose')
      const key = new TextEncoder().encode('test-secret-at-least-32-characters-long')

      const wrongIssuerToken = await new SignJWT(validPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('wrong-issuer')
        .setExpirationTime('30d')
        .sign(key)

      await expect(verifyGalleryUploadToken(wrongIssuerToken)).rejects.toThrow()
    })
  })
})
