'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { secureAction } from '@/lib/auth/secure-action'
import { signFamilyToken } from '@/lib/family-token'
import { invalidateFamily } from '@/lib/cache/invalidation'
import { Resend } from 'resend'
import { env } from '@/lib/env'

const resend = new Resend(env().AUTH_RESEND_KEY)

// ---------------------------------------------------------------------------
// Owner: list family members
// ---------------------------------------------------------------------------

export const listFamilyMembers = secureAction(
  { roles: 'OWNER', schema: z.object({}) },
  async () => {
    const members = await prisma.user.findMany({
      where: { isFamilyMember: true },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }
)

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

    // Send family booking invite email
    const token = await signFamilyToken({
      email: data.email,
      name: data.name,
    })

    const appUrl = env().NEXT_PUBLIC_APP_URL ?? ''
    const bookingUrl = `${appUrl}/book?family=${token}`

    await resend.emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: data.email,
      subject: "You're invited to book at Grizzly Getaway!",
      html: `
        <h2>Family Booking Invitation</h2>
        <p>Hello ${data.name},</p>
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

    const token = await signFamilyToken({
      email: user.email,
      name: user.name ?? 'Family',
    })

    const appUrl = env().NEXT_PUBLIC_APP_URL ?? ''
    const bookingUrl = `${appUrl}/book?family=${token}`

    await resend.emails.send({
      from: env().RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Your Grizzly Getaway booking link',
      html: `
        <h2>Here's your booking link!</h2>
        <p>Hello ${user.name ?? 'there'},</p>
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
