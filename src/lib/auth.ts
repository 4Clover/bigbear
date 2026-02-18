import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
  },
  callbacks: {
    // Authorized callback for proxy support (Next.js 16+)
    // Actual route protection logic is in proxy.ts
    authorized: () => {
      // Always return true - proxy.ts handles the actual logic
      // This callback just enables the proxy integration
      return true
    },
    signIn({ account, profile }) {
      if (account?.provider === 'google') {
        return profile?.email_verified === true
      }
      return true
    },
    session({ session, user }) {
      session.user.id = user.id
      session.user.role = (user as { role: UserRole }).role
      return session
    },
  },
  events: {
    async createUser({ user }) {
      const adminEmails =
        process.env.AUTHORIZED_ADMIN_EMAILS?.split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean) ?? []

      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'OWNER' },
        })
      }
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
})
