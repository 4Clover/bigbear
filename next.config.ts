import type { NextConfig } from 'next'

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
      // Scripts: self + Stripe + unsafe-inline/eval for Next.js dev
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      // Styles: self + unsafe-inline for Tailwind
      "style-src 'self' 'unsafe-inline'",
      // Images: self + blob + data + Vercel Blob storage
      "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
      // Fonts: self
      "font-src 'self'",
      // Connect: self + Stripe API + Upstash
      "connect-src 'self' https://api.stripe.com https://*.upstash.io",
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
      // Upgrade insecure requests in production
      'upgrade-insecure-requests',
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
    // Using unoptimized for dynamic gallery images from database
    // Remove this and configure remotePatterns for production optimization
    unoptimized: true,
  },
  async headers() {
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
