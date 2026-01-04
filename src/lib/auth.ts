import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
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
    authorized: async ({ auth }) => {
      // Always return true - proxy.ts handles the actual logic
      // This callback just enables the proxy integration
      return !!auth
    },
    session({ session, user }) {
      session.user.id = user.id
      session.user.role = (user as { role: UserRole }).role
      return session
    },
  },
})
