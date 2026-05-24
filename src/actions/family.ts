'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { secureAction } from '@/lib/auth/secure-action'
import { signFamilyToken } from '@/lib/family-token'
import { invalidateFamily } from '@/lib/cache/invalidation'
import { Resend } from 'resend'
import { env } from '@/lib/env'

// Lazy-loaded to avoid module-scope crash on bad AUTH_RESEND_KEY and to enable test isolation
const getResend = () => new Resend(env().AUTH_RESEND_KEY)

// HTML-encode untrusted strings before interpolating into email HTML bodies
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ---------------------------------------------------------------------------
// Owner: add a family member (by email) and send booking invite
// ---------------------------------------------------------------------------

export const addFamilyMember = secureAction(
  {
    roles: 'OWNER',
    schema: z.object({
      email: z.email(),
      name: z.string().min(1).max(100),
    }),
  },
  async ({ data }) => {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      if (existingUser.isFamilyMember) {
        return { success: false, error: 'This person is already a family member' }
      }
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { isFamilyMember: true },
      })
    }
    // If user doesn't exist yet, they'll be marked as family when they first sign in
    // (handled by the signIn event in auth.ts if needed, or they book via token)

    const appUrl = env().NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return { success: false, error: 'Application URL not configured' }
    }

    // Send family booking invite email
    const token = await signFamilyToken({
      email: data.email,
      name: data.name,
    })

    const bookingUrl = `${appUrl}/book?family=${token}`
    const safeName = escapeHtml(data.name)

    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: data.email,
      subject: "You're invited to book at Grizzly Getaway!",
      html: `
        <h2>Family Booking Invitation</h2>
        <p>Hello ${safeName},</p>
        <p>You've been invited to book a stay at Grizzly Getaway as a family member.
        As family, no payment is required — just pick your dates and confirm!</p>
        <p><a href="${bookingUrl}" style="display:inline-block; padding:12px 24px; background-color:#447a52; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
          Book Your Stay
        </a></p>
        <p style="color:#666; font-size:12px;">This link expires in 30 days. Contact the owner if you need a new one.</p>
        <p>Looking forward to hosting you!<br>Grizzly Getaway</p>
      `,
    })

    invalidateFamily()
    return { success: true }
  }
)

// ---------------------------------------------------------------------------
// Owner: remove family member status
// ---------------------------------------------------------------------------

export const removeFamilyMember = secureAction(
  {
    roles: 'OWNER',
    schema: z.object({ userId: z.string().min(1) }),
  },
  async ({ data }) => {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { isFamilyMember: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }
    if (!user.isFamilyMember) {
      return { success: false, error: 'User is not a family member' }
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: { isFamilyMember: false },
    })

    invalidateFamily()
    return { success: true }
  }
)

// ---------------------------------------------------------------------------
// Owner: resend family booking invite
// ---------------------------------------------------------------------------

export const resendFamilyInvite = secureAction(
  {
    roles: 'OWNER',
    schema: z.object({ userId: z.string().min(1) }),
  },
  async ({ data }) => {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true, email: true, isFamilyMember: true },
    })

    if (!user?.isFamilyMember) {
      return { success: false, error: 'User is not a family member' }
    }

    const appUrl = env().NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return { success: false, error: 'Application URL not configured' }
    }

    const token = await signFamilyToken({
      email: user.email,
      name: user.name ?? 'Family',
    })

    const bookingUrl = `${appUrl}/book?family=${token}`
    const safeName = escapeHtml(user.name ?? 'there')

    await getResend().emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Your Grizzly Getaway booking link',
      html: `
        <h2>Here's your booking link!</h2>
        <p>Hello ${safeName},</p>
        <p>Use the link below to book your stay at Grizzly Getaway. As family, no payment is required!</p>
        <p><a href="${bookingUrl}" style="display:inline-block; padding:12px 24px; background-color:#447a52; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
          Book Your Stay
        </a></p>
        <p style="color:#666; font-size:12px;">This link expires in 30 days.</p>
        <p>See you soon!<br>Grizzly Getaway</p>
      `,
    })

    return { success: true }
  }
)
