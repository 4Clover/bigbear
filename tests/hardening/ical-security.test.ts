import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'

const { defaultEnvValues, mockEnv } = vi.hoisted(() => {
  const defaultEnvValues = {
    ICAL_SECRET: 'test-ical-secret-1234567890',
  }
  return {
    defaultEnvValues,
    mockEnv: vi.fn(() => ({ ...defaultEnvValues })),
  }
})

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/utils/calendar', () => ({
  formatICalDate: vi.fn((d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')),
}))

const { GET } = await import('@/app/api/calendar/ical/route')

function createRequest(path: string, headers?: Record<string, string>): Request {
  return new Request(`http://localhost${path}`, { method: 'GET', headers })
}

describe('iCal Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.mockReturnValue({ ...defaultEnvValues })
  })

  it('should return 401 when no token is provided', async () => {
    const response = await GET(createRequest('/api/calendar/ical'))

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 401 when token is invalid', async () => {
    const response = await GET(createRequest('/api/calendar/ical?token=wrong-token'))

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 200 with iCal content for valid token', async () => {
    prismaMock.booking.findMany.mockResolvedValue([])
    prismaMock.blockedDate.findMany.mockResolvedValue([])

    const response = await GET(
      createRequest(`/api/calendar/ical?token=${defaultEnvValues.ICAL_SECRET}`)
    )

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('END:VCALENDAR')
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
  })

  it('should never expose blocked.reason in iCal output', async () => {
    const sensitiveReason = 'Owner vacation - plumbing broken'

    prismaMock.booking.findMany.mockResolvedValue([])
    prismaMock.blockedDate.findMany.mockResolvedValue([
      {
        id: 'blocked-1',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-05'),
        reason: sensitiveReason,
        notes: null,
        source: 'manual',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const response = await GET(
      createRequest(`/api/calendar/ical?token=${defaultEnvValues.ICAL_SECRET}`)
    )

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('SUMMARY:Blocked')
    expect(body).not.toContain(sensitiveReason)
    expect(body).not.toContain('plumbing')
    expect(body).not.toContain('Blocked -')
  })
})
