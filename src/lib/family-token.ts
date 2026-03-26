import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

import { env } from './env'

export interface FamilyTokenPayload extends JWTPayload {
  email: string
  name: string
}

/**
 * Sign a JWT token for family booking access with 30-day expiration.
 * Sent via email to family members for payment-free booking.
 */
export async function signFamilyToken(
  payload: Omit<FamilyTokenPayload, keyof JWTPayload>
): Promise<string> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('family-booking')
    .setExpirationTime('30d')
    .sign(key)
}

/**
 * Verify a family booking JWT token.
 * Returns the payload if valid, throws if invalid or expired.
 */
export async function verifyFamilyToken(token: string): Promise<FamilyTokenPayload> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  const { payload } = await jwtVerify(token, key, {
    issuer: 'family-booking',
  })

  return payload as unknown as FamilyTokenPayload
}
