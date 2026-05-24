import { type NextRequest, type NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { env } from '@/lib/env'
import type { UserRole } from '@prisma/client'
import type { Session } from 'next-auth'

// ---------------------------------------------------------------------------
// authenticatedRoute — for protected API routes with role checks
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with authentication and role-based access control.
 *
 * @example
 * ```ts
 * export const GET = authenticatedRoute(
 *   ['OWNER', 'ACCOUNTANT'],
 *   async (request, session) => {
 *     const data = await fetchData(session.user.id)
 *     return NextResponse.json(data)
 *   }
 * )
 * ```
 */
export const authenticatedRoute = (
  roles: UserRole | UserRole[],
  handler: (request: NextRequest, session: Session) => Promise<NextResponse>
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth()
    if (!session?.user) {
      return apiUnauthorized()
    }

    const allowed = Array.isArray(roles) ? roles : [roles]
    if (!allowed.includes(session.user.role)) {
      return apiUnauthorized()
    }

    return handler(request, session)
  }
}

// ---------------------------------------------------------------------------
// cronRoute — for cron jobs authenticated with CRON_SECRET
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with Bearer token verification for cron jobs.
 * Automatically validates `Authorization: Bearer <CRON_SECRET>`.
 *
 * @example
 * ```ts
 * export const dynamic = 'force-dynamic'
 *
 * export const GET = cronRoute(async (request) => {
 *   await processReminders()
 *   return NextResponse.json({ processed: true })
 * })
 * ```
 */
export const cronRoute = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization')
    const cronSecret = env().CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return apiError('Unauthorized', 401)
    }

    return handler(request)
  }
}
