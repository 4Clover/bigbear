import { vi } from 'vitest'

/**
 * Mock for @upstash/ratelimit and @upstash/redis
 */

// Mock rate limit result
export interface MockRateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

// Default successful rate limit result
export const createMockRateLimitResult = (
  overrides: Partial<MockRateLimitResult> = {}
): MockRateLimitResult => ({
  success: true,
  remaining: 4,
  reset: Date.now() + 60000,
  limit: 5,
  ...overrides,
})

// Mock Ratelimit class
export const mockLimit = vi.fn().mockResolvedValue(createMockRateLimitResult())

export class MockRatelimit {
  static slidingWindow = vi.fn().mockReturnValue({})
  static fixedWindow = vi.fn().mockReturnValue({})
  static tokenBucket = vi.fn().mockReturnValue({})

  limit = mockLimit
}

// Mock Redis class
export class MockRedis {
  static fromEnv = vi.fn().mockReturnValue({})
}

// Helper to simulate rate limit exceeded
export const simulateRateLimitExceeded = () => {
  mockLimit.mockResolvedValueOnce(
    createMockRateLimitResult({
      success: false,
      remaining: 0,
    })
  )
}

// Helper to reset mocks
export const resetUpstashMocks = () => {
  mockLimit.mockReset()
  mockLimit.mockResolvedValue(createMockRateLimitResult())
  // Clear static method mocks
  MockRatelimit.slidingWindow.mockClear()
  MockRatelimit.fixedWindow.mockClear()
  MockRatelimit.tokenBucket.mockClear()
  MockRedis.fromEnv.mockClear()
}
