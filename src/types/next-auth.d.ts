import { type UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: UserRole
    isFamilyMember: boolean
  }
  interface Session {
    user: User & {
      id: string
      role: UserRole
      isFamilyMember: boolean
    }
  }
}
