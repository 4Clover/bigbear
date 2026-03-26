import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

import { env } from './env'

export interface ReviewTokenPayload extends JWTPayload {
  bookingId: string
  guestName: string
  guestEmail: string
}

/**
 * Sign a JWT token for review submission with 14-day expiration
 * Used to grant temporary review access to guests after checkout
 */
export async function signReviewToken(
  payload: Omit<ReviewTokenPayload, keyof JWTPayload>
): Promise<string> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('review-submit')
    .setExpirationTime('14d')
    .sign(key)
}

/**
 * Verify a JWT token for review submission
 * Returns the payload if valid, throws if invalid or expired
 */
export async function verifyReviewToken(token: string): Promise<ReviewTokenPayload> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  const { payload } = await jwtVerify(token, key, {
    issuer: 'review-submit',
  })

  return payload as unknown as ReviewTokenPayload
}
