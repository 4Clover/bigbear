import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

import { env } from './env'

export const GALLERY_CATEGORIES = [
  'Exterior',
  'Bedrooms',
  'Kitchen',
  'Bathrooms',
  'Living Areas',
  'Outdoors',
  'Amenities',
] as const

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number]

export interface GalleryUploadTokenPayload extends JWTPayload {
  bookingId: string
  guestName: string
  guestEmail: string
}

/**
 * Sign a JWT token for gallery upload with 30-day expiration
 * Used to grant temporary upload access to guests
 */
export async function signGalleryUploadToken(
  payload: Omit<GalleryUploadTokenPayload, keyof JWTPayload>
): Promise<string> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('gallery-upload')
    .setExpirationTime('30d')
    .sign(key)
}

/**
 * Verify a JWT token for gallery upload
 * Returns the payload if valid, throws if invalid or expired
 */
export async function verifyGalleryUploadToken(token: string): Promise<GalleryUploadTokenPayload> {
  const key = new TextEncoder().encode(env().AUTH_SECRET)

  const { payload } = await jwtVerify(token, key, {
    issuer: 'gallery-upload',
  })

  return payload as unknown as GalleryUploadTokenPayload
}
