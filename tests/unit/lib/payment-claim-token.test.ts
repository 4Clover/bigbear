import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: () => ({ AUTH_SECRET: 'test-secret-at-least-32-characters-long' }),
}))

const { signPaymentClaimToken, verifyPaymentClaimToken } = await import('@/lib/payment-claim-token')

const validPayload = {
  bookingId: 'booking-abc',
  guestEmail: 'jane@example.com',
}

describe('Payment Claim Token', () => {
  describe('signPaymentClaimToken', () => {
    it('should return a JWT string with 3 dot-separated parts', async () => {
      const token = await signPaymentClaimToken(validPayload)

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyPaymentClaimToken', () => {
    it('should verify a freshly signed token and return correct payload', async () => {
      const token = await signPaymentClaimToken(validPayload)
      const result = await verifyPaymentClaimToken(token)

      expect(result.bookingId).toBe('booking-abc')
      expect(result.guestEmail).toBe('jane@example.com')
    })

    it('should throw for an invalid token string', async () => {
      await expect(verifyPaymentClaimToken('not.a.valid.jwt')).rejects.toThrow()
    })

    it('should throw for a completely malformed token', async () => {
      await expect(verifyPaymentClaimToken('garbage')).rejects.toThrow()
    })

    it('should throw for an expired token (lifetime is 25h)', async () => {
      vi.useFakeTimers()
      try {
        const token = await signPaymentClaimToken(validPayload)

        vi.advanceTimersByTime(26 * 60 * 60 * 1000)

        await expect(verifyPaymentClaimToken(token)).rejects.toThrow()
      } finally {
        vi.useRealTimers()
      }
    })

    it('should still verify just before the 25h expiry', async () => {
      vi.useFakeTimers()
      try {
        const token = await signPaymentClaimToken(validPayload)

        vi.advanceTimersByTime(24 * 60 * 60 * 1000)

        const result = await verifyPaymentClaimToken(token)
        expect(result.bookingId).toBe('booking-abc')
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
        .setIssuer('payment-claim')
        .setExpirationTime('25h')
        .sign(wrongKey)

      await expect(verifyPaymentClaimToken(badToken)).rejects.toThrow()
    })

    it('should throw for a token with wrong issuer', async () => {
      const { SignJWT } = await import('jose')
      const key = new TextEncoder().encode('test-secret-at-least-32-characters-long')

      const wrongIssuerToken = await new SignJWT(validPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('family-booking')
        .setExpirationTime('25h')
        .sign(key)

      await expect(verifyPaymentClaimToken(wrongIssuerToken)).rejects.toThrow()
    })

    it('should throw for a tampered token', async () => {
      const token = await signPaymentClaimToken(validPayload)
      const [header, , signature] = token.split('.')
      const tamperedPayload = Buffer.from(
        JSON.stringify({ bookingId: 'booking-evil', guestEmail: 'evil@example.com' })
      ).toString('base64url')

      await expect(
        verifyPaymentClaimToken(`${header ?? ''}.${tamperedPayload}.${signature ?? ''}`)
      ).rejects.toThrow()
    })
  })
})
