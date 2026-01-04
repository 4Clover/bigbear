import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

describe('Rate Limiting Edge Cases', () => {
  beforeEach(() => {
    vi.resetModules()
    // Clear Upstash env vars to use in-memory fallback
    process.env = { ...originalEnv }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('In-Memory Fallback', () => {
    it('should use in-memory rate limiting when Upstash is not configured', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/rate-limit')

      const result = await checkRateLimit('test:ip', RATE_LIMITS.contact)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.contact.limit - 1)
    })

    it('should block requests after limit is exceeded', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit')
      const options = { limit: 3, windowSeconds: 60 }

      // Make requests up to the limit
      await checkRateLimit('test:ip1', options)
      await checkRateLimit('test:ip1', options)
      await checkRateLimit('test:ip1', options)

      // 4th request should be blocked
      const result = await checkRateLimit('test:ip1', options)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should track different identifiers separately', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit')
      const options = { limit: 2, windowSeconds: 60 }

      // Exhaust limit for ip1
      await checkRateLimit('test:ip1', options)
      await checkRateLimit('test:ip1', options)
      const ip1Result = await checkRateLimit('test:ip1', options)

      // ip2 should still have its full limit
      const ip2Result = await checkRateLimit('test:ip2', options)

      expect(ip1Result.success).toBe(false)
      expect(ip2Result.success).toBe(true)
      expect(ip2Result.remaining).toBe(1)
    })

    it('should track different endpoint prefixes separately', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/rate-limit')

      // Use the same IP for different endpoints
      const contactResult = await checkRateLimit('contact:sameip', RATE_LIMITS.contact)
      const checkoutResult = await checkRateLimit('checkout:sameip', RATE_LIMITS.checkout)

      // Both should succeed independently
      expect(contactResult.success).toBe(true)
      expect(checkoutResult.success).toBe(true)
    })
  })

  describe('getClientIdentifier', () => {
    it('should use x-forwarded-for header when available', async () => {
      const { getClientIdentifier } = await import('@/lib/rate-limit')

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })

      expect(getClientIdentifier(request)).toBe('1.2.3.4')
    })

    it('should use x-real-ip header as fallback', async () => {
      const { getClientIdentifier } = await import('@/lib/rate-limit')

      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '9.8.7.6' },
      })

      expect(getClientIdentifier(request)).toBe('9.8.7.6')
    })

    it('should use x-vercel-forwarded-for header as fallback', async () => {
      const { getClientIdentifier } = await import('@/lib/rate-limit')

      const request = new Request('http://localhost', {
        headers: { 'x-vercel-forwarded-for': '11.22.33.44' },
      })

      expect(getClientIdentifier(request)).toBe('11.22.33.44')
    })

    it('should return "unknown" when no IP headers are present', async () => {
      const { getClientIdentifier } = await import('@/lib/rate-limit')

      const request = new Request('http://localhost')

      expect(getClientIdentifier(request)).toBe('unknown')
    })

    it('should handle spoofed x-forwarded-for by taking first IP', async () => {
      const { getClientIdentifier } = await import('@/lib/rate-limit')

      // Attacker might try to add fake IPs
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': 'attacker-ip, proxy1, proxy2' },
      })

      // Should take the first IP (which is set by the first proxy)
      expect(getClientIdentifier(request)).toBe('attacker-ip')
    })
  })

  describe('RATE_LIMITS configuration', () => {
    it('should have availability rate limit defined', async () => {
      const { RATE_LIMITS } = await import('@/lib/rate-limit')

      expect(RATE_LIMITS.availability).toBeDefined()
      expect(RATE_LIMITS.availability.limit).toBe(60)
      expect(RATE_LIMITS.availability.windowSeconds).toBe(60)
    })

    it('should have all expected rate limit configs', async () => {
      const { RATE_LIMITS } = await import('@/lib/rate-limit')

      expect(RATE_LIMITS.contact).toBeDefined()
      expect(RATE_LIMITS.checkout).toBeDefined()
      expect(RATE_LIMITS.api).toBeDefined()
      expect(RATE_LIMITS.availability).toBeDefined()
    })
  })

  describe('Production Warning', () => {
    it('should log warning when using in-memory in production', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.stubEnv('NODE_ENV', 'production')

      vi.resetModules()
      const { checkRateLimit } = await import('@/lib/rate-limit')

      await checkRateLimit('test:ip', { limit: 5, windowSeconds: 60 })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using in-memory rate limiting in production')
      )

      consoleSpy.mockRestore()
      vi.unstubAllEnvs()
    })
  })
})
