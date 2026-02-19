import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateExternalUrl } from '@/lib/security'
import { prismaMock } from '../__mocks__/prisma'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: vi.fn(() => ({ CRON_SECRET: 'test-cron-secret' })),
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('node-ical', () => ({
  default: {
    async: {
      parseICS: vi.fn().mockResolvedValue({}),
    },
  },
}))

const { GET } = await import('@/app/api/cron/calendar-sync/route')

function createCronRequest(): Request {
  return new Request('http://localhost/api/cron/calendar-sync', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('Calendar Sync Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.mockReturnValue({ CRON_SECRET: 'test-cron-secret' })
  })

  describe('SSRF Protection - validateExternalUrl', () => {
    it('should reject private IP URLs', () => {
      expect(() => validateExternalUrl('https://192.168.1.1/cal.ics')).toThrow(
        'Private IP addresses are not allowed'
      )
    })

    it('should reject cloud metadata endpoint URLs', () => {
      expect(() => validateExternalUrl('https://169.254.169.254/latest/meta-data/')).toThrow()
    })

    it('should reject non-HTTPS URLs', () => {
      expect(() => validateExternalUrl('http://example.com/cal.ics')).toThrow(
        'Only HTTPS URLs are allowed'
      )
    })

    it('should reject invalid/malformed URLs', () => {
      expect(() => validateExternalUrl('not-a-valid-url')).toThrow('Invalid URL format')
    })

    it('should accept valid HTTPS URLs with domain names', () => {
      expect(validateExternalUrl('https://airbnb.com/calendar.ics')).toBe(true)
    })
  })

  describe('Fetch Timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    })

    it('should abort fetch after 30 seconds and record timeout error', async () => {
      const mockFetch = vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }
          })
      )
      vi.stubGlobal('fetch', mockFetch)

      prismaMock.calendarSync.findMany.mockResolvedValue([
        {
          id: 'sync-timeout',
          name: 'Slow Calendar',
          icalUrl: 'https://slow-server.example.com/calendar.ics',
          isActive: true,
          lastSynced: null,
          lastError: null,
          syncCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      prismaMock.calendarSync.update.mockResolvedValue({
        id: 'sync-timeout',
        name: 'Slow Calendar',
        icalUrl: 'https://slow-server.example.com/calendar.ics',
        isActive: true,
        lastSynced: null,
        lastError: 'The operation was aborted.',
        syncCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const promise = GET(createCronRequest())
      await vi.advanceTimersByTimeAsync(30_000)
      const response = await promise

      const json = (await response.json()) as {
        results: { status: string }[]
      }
      expect(json.results[0]?.status).toContain('error')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slow-server.example.com/calendar.ics',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
  })
})
