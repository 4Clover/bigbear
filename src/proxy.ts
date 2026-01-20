import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Global route protection proxy (Next.js 16+)
 * Provides defense-in-depth for protected routes
 * (Layout-level guards remain as secondary protection)
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Check if route requires owner or worker access
  const isOwnerRoute = pathname.startsWith('/owner')
  const isWorkerRoute = pathname.startsWith('/worker')
  const isProtectedRoute = isOwnerRoute || isWorkerRoute

  if (isProtectedRoute) {
    // Not authenticated at all
    if (!session?.user) {
      const loginUrl = new URL('/login', req.nextUrl.origin)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check role-specific access
    if (isOwnerRoute && session.user.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin))
    }

    if (isWorkerRoute && session.user.role !== 'WORKER') {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Proxy runs on Node.js runtime by default (Next.js 16+)
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by their own auth guards)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public assets (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
