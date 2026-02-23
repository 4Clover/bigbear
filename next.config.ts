import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

// Script-src CSP: include unsafe-eval only in development (required for Next.js hot reload)
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com"
  : "'self' 'unsafe-inline' https://js.stripe.com"

// Security headers for all routes
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + Stripe (unsafe-eval only in development)
      `script-src ${scriptSrc}`,
      // Styles: self + unsafe-inline for Tailwind
      "style-src 'self' 'unsafe-inline'",
      // Images: self + blob + data + Vercel Blob storage
      "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
      // Fonts: self
      "font-src 'self'",
      // Connect: self + Stripe API + Upstash + Vercel Blob
      "connect-src 'self' https://api.stripe.com https://*.upstash.io https://vercel.com https://*.public.blob.vercel-storage.com",
      // Frames: self + Stripe (for 3D Secure)
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      // Block object/embed
      "object-src 'none'",
      // Base URI
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
      // Frame ancestors (clickjacking protection)
      "frame-ancestors 'self'",
      // Upgrade insecure requests in production only
      ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
