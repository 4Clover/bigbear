import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'

const mockAuth = vi.hoisted(() => vi.fn())
const mockHandleUpload = vi.hoisted(() => vi.fn())
const mockHeaders = vi.hoisted(() => vi.fn())
const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockVerifyGalleryUploadToken = vi.hoisted(() => vi.fn())

const { defaultEnvValues, mockEnv } = vi.hoisted(() => {
  const defaultEnvValues = {
    OWNER_EMAIL: 'owner@test.com',
    CRON_SECRET: 'test-cron-secret-1234567890',
    ICAL_SECRET: 'test-ical-secret-1234567890',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  }
  return {
    defaultEnvValues,
    mockEnv: vi.fn(() => ({ ...defaultEnvValues })),
  }
})

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@vercel/blob/client', () => ({ handleUpload: mockHandleUpload }))
vi.mock('next/headers', () => ({ headers: mockHeaders }))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    refunds: { create: vi.fn() },
  },
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

vi.mock('@/lib/notifications', () => ({
  sendBookingConfirmation: vi.fn(),
  sendPaymentReceived: vi.fn(),
  sendPaymentFailed: vi.fn(),
  sendBookingFailedRefund: vi.fn(),
  sendCheckinReminder: vi.fn(),
  sendCheckoutReminder: vi.fn(),
  sendGalleryUploadInvite: vi.fn(),
}))

vi.mock('@/lib/utils/calendar', () => ({
  isDateRangeAvailable: vi.fn(),
  formatICalDate: vi.fn(),
}))

vi.mock('@/lib/security', () => ({
  validateExternalUrl: vi.fn(),
  escapeHtml: vi.fn((s: string) => s),
}))

vi.mock('node-ical', () => ({
  default: { async: { fromURL: vi.fn() } },
}))

vi.mock('@/actions/reports', () => ({
  exportReportToCsv: vi.fn(),
  generateMonthlyReport: vi.fn(),
  generateAnnualReport: vi.fn(),
  generateScheduleEReport: vi.fn(),
}))

vi.mock('@react-pdf/renderer', () => ({
  default: { renderToStream: vi.fn() },
}))

vi.mock('@/components/pdf/MonthlyReportPdf', () => ({
  MonthlyReportPdf: vi.fn(),
}))

vi.mock('@/components/pdf/AnnualReportPdf', () => ({
  AnnualReportPdf: vi.fn(),
}))

vi.mock('@/components/pdf/ScheduleEReportPdf', () => ({
  ScheduleEReportPdf: vi.fn(),
}))

vi.mock('@/lib/gallery-token', () => ({
  verifyGalleryUploadToken: mockVerifyGalleryUploadToken,
  GALLERY_CATEGORIES: ['Exterior'],
}))

const { GET: csvGET } = await import('@/app/api/reports/csv/route')
const { GET: pdfGET } = await import('@/app/api/reports/pdf/route')
const { POST: receiptsPost } = await import('@/app/api/upload/receipts/route')
const { POST: maintenancePost } = await import('@/app/api/upload/maintenance/route')
const { POST: galleryPost } = await import('@/app/api/upload/gallery/route')
const { GET: remindersGET } = await import('@/app/api/cron/reminders/route')
const { GET: calendarSyncGET } = await import('@/app/api/cron/calendar-sync/route')
const { POST: webhookPost } = await import('@/app/api/stripe/webhook/route')
const { GET: icalGET } = await import('@/app/api/calendar/ical/route')

function createGetRequest(path: string): Request {
  return new Request(`http://localhost${path}`, { method: 'GET' })
}

function createUploadRequest(path: string): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'test.jpg',
        callbackUrl: `http://localhost${path}`,
        clientPayload: null,
        multipart: false,
      },
    }),
  })
}

function setupHandleUploadMock() {
  mockHandleUpload.mockImplementation(
    async ({
      onBeforeGenerateToken,
    }: {
      onBeforeGenerateToken: (...args: unknown[]) => Promise<unknown>
    }) => {
      await onBeforeGenerateToken('test.jpg', null, false)
      return { type: 'blob.generate-client-token' as const, clientToken: 'mock-token' }
    }
  )
}

describe('API Route Authorization Boundaries', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockHandleUpload.mockReset()
    mockHeaders.mockReset()
    mockConstructEvent.mockReset()
    mockVerifyGalleryUploadToken.mockReset()
    mockEnv.mockReturnValue({ ...defaultEnvValues })
  })

  describe('session-protected: /api/reports/csv', () => {
    it('should return 401 when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await csvGET(createGetRequest('/api/reports/csv?year=2025') as never)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when role is GUEST', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'g-1', role: 'GUEST', email: 'guest@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await csvGET(createGetRequest('/api/reports/csv?year=2025') as never)

      expect(response.status).toBe(401)
    })

    it('should return 401 when role is WORKER', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'w-1', role: 'WORKER', email: 'worker@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await csvGET(createGetRequest('/api/reports/csv?year=2025') as never)

      expect(response.status).toBe(401)
    })
  })

  describe('session-protected: /api/reports/pdf', () => {
    it('should return 401 when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await pdfGET(
        createGetRequest('/api/reports/pdf?type=monthly&year=2025&month=1') as never
      )
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when role is WORKER', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'w-1', role: 'WORKER', email: 'worker@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await pdfGET(
        createGetRequest('/api/reports/pdf?type=monthly&year=2025&month=1') as never
      )

      expect(response.status).toBe(401)
    })
  })

  describe('session-protected: /api/upload/receipts', () => {
    it('should return 401 when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await receiptsPost(createUploadRequest('/api/upload/receipts'))
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 401 when role is GUEST', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'g-1', role: 'GUEST', email: 'guest@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await receiptsPost(createUploadRequest('/api/upload/receipts'))

      expect(mockHandleUpload).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should return 401 when role is WORKER', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'w-1', role: 'WORKER', email: 'worker@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await receiptsPost(createUploadRequest('/api/upload/receipts'))

      expect(response.status).toBe(401)
    })
  })

  describe('session-protected: /api/upload/maintenance', () => {
    it('should return 401 when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await maintenancePost(createUploadRequest('/api/upload/maintenance'))
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 401 when role is GUEST', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'g-1', role: 'GUEST', email: 'guest@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await maintenancePost(createUploadRequest('/api/upload/maintenance'))

      expect(mockHandleUpload).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should return 401 when role is ACCOUNTANT', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'a-1', role: 'ACCOUNTANT', email: 'acct@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await maintenancePost(createUploadRequest('/api/upload/maintenance'))

      expect(response.status).toBe(401)
    })
  })

  describe('session-protected: /api/upload/gallery', () => {
    it('should return 400 when no session and no guest JWT', async () => {
      mockAuth.mockResolvedValue(null)
      setupHandleUploadMock()

      const response = await galleryPost(createUploadRequest('/api/upload/gallery'))
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBeDefined()
    })

    it('should return 400 when non-OWNER session and no guest JWT', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'g-1', role: 'GUEST', email: 'guest@test.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })
      setupHandleUploadMock()

      const response = await galleryPost(createUploadRequest('/api/upload/gallery'))
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBeDefined()
    })
  })

  describe('bearer-protected: /api/cron/reminders', () => {
    it('should return 401 when no authorization header', async () => {
      const response = await remindersGET(createGetRequest('/api/cron/reminders') as never)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when bearer token is wrong', async () => {
      const request = new Request('http://localhost/api/cron/reminders', {
        headers: { Authorization: 'Bearer wrong-secret' },
      })

      const response = await remindersGET(request as never)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when CRON_SECRET is not configured', async () => {
      mockEnv.mockReturnValue({ ...defaultEnvValues, CRON_SECRET: '' })

      const request = new Request('http://localhost/api/cron/reminders', {
        headers: { Authorization: 'Bearer some-token' },
      })

      const response = await remindersGET(request as never)

      expect(response.status).toBe(401)
    })
  })

  describe('bearer-protected: /api/cron/calendar-sync', () => {
    it('should return 401 when no authorization header', async () => {
      const response = await calendarSyncGET(createGetRequest('/api/cron/calendar-sync'))
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when bearer token is wrong', async () => {
      const request = new Request('http://localhost/api/cron/calendar-sync', {
        headers: { Authorization: 'Bearer wrong-secret' },
      })

      const response = await calendarSyncGET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })
  })

  describe('signature-protected: /api/stripe/webhook', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      mockHeaders.mockResolvedValue(new Headers())

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
      })

      const response = await webhookPost(request as never)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Missing stripe-signature header')
    })

    it('should return 400 when stripe signature is invalid', async () => {
      mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'invalid-sig' }))
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: '{"some":"payload"}',
      })

      const response = await webhookPost(request as never)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Webhook signature verification failed')
    })

    it('should return 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      mockEnv.mockReturnValue({ ...defaultEnvValues, STRIPE_WEBHOOK_SECRET: '' })
      mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'some-sig' }))

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
      })

      const response = await webhookPost(request as never)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe('Webhook not configured')
    })
  })

  describe('token-protected: /api/calendar/ical', () => {
    it('should return 401 when no token provided', async () => {
      const response = await icalGET(createGetRequest('/api/calendar/ical'))
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when query param token is wrong', async () => {
      const response = await icalGET(createGetRequest('/api/calendar/ical?token=wrong-secret'))
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 401 when bearer token is wrong', async () => {
      const request = new Request('http://localhost/api/calendar/ical', {
        headers: { Authorization: 'Bearer wrong-secret' },
      })

      const response = await icalGET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBeDefined()
    })

    it('should return 500 when ICAL_SECRET is not configured', async () => {
      mockEnv.mockReturnValue({ ...defaultEnvValues, ICAL_SECRET: '' })

      const response = await icalGET(createGetRequest('/api/calendar/ical?token=some-token'))
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe('Calendar export not configured')
    })
  })
})
