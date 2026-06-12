import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

import { env } from './env'

export interface PaymentClaimTokenPayload extends JWTPayload {
  bookingId: string
  guestEmail: string
}

/**
 * Sign a JWT token that lets a guest mark their Hold as "payment sent".
 * Lifetime is 25h — slightly longer than the 24h Hold so the emailed link
 * never dies while the Hold is still live.
 */
export async function signPaymentClaimToken(
  payload: Omit<PaymentClaimTokenPayload, keyof JWTPayload>
): Promise<string> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('payment-claim')
    .setExpirationTime('25h')
    .sign(key)
}

/**
 * Verify a payment-claim JWT token.
 * Returns the payload if valid, throws if invalid or expired.
 */
export async function verifyPaymentClaimToken(token: string): Promise<PaymentClaimTokenPayload> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  const { payload } = await jwtVerify(token, key, {
    issuer: 'payment-claim',
  })

  return payload as unknown as PaymentClaimTokenPayload
}
