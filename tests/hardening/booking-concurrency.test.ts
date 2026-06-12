import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { mockAuth } from '../__mocks__/auth'
import { env as mockEnv } from '../__mocks__/env'
import { prismaMock } from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

const mockHeaders = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockRefundCreate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    refunds: {
      create: mockRefundCreate,
    },
  },
}))

const mockSendBookingConfirmation = vi.hoisted(() => vi.fn())
const mockSendPaymentReceived = vi.hoisted(() => vi.fn())
const mockSendPaymentFailed = vi.hoisted(() => vi.fn())
const mockSendBookingFailedRefund = vi.hoisted(() => vi.fn())

vi.mock('@/lib/notifications', () => ({
  sendBookingConfirmation: mockSendBookingConfirmation,
  sendPaymentReceived: mockSendPaymentReceived,
  sendPaymentFailed: mockSendPaymentFailed,
  sendBookingFailedRefund: mockSendBookingFailedRefund,
}))

const mockIsDateRangeAvailable = vi.hoisted(() => vi.fn())

vi.mock('@/lib/utils/calendar', () => ({
  isDateRangeAvailable: mockIsDateRangeAvailable,
}))

const { POST } = await import('@/app/api/stripe/webhook/route')
const stripeEventMock = (prismaMock as any).stripeEvent

const createWebhookRequest = () =>
  new Request('http://localhost/api/stripe/webhook', { method: 'POST' }) as never

const createCheckoutEvent = (overrides?: {
  eventId?: string
  paymentIntentId?: string
  amountTotalCents?: number
  totalAmount?: string
  depositAmount?: string
}) => ({
  id: overrides?.eventId ?? 'evt_concurrency_default',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_concurrency_default',
      payment_intent: overrides?.paymentIntentId ?? 'pi_concurrency_default',
      amount_total: overrides?.amountTotalCents ?? 62500,
      metadata: {
        guestEmail: 'guest@test.com',
        guestName: 'Concurrency Guest',
        guestPhone: '555-1000',
        checkIn: '2026-08-15',
        checkOut: '2026-08-18',
        basePrice: '500',
        addonsTotal: '25',
        depositAmount: overrides?.depositAmount ?? '100',
        totalAmount: overrides?.totalAmount ?? '525',
        addons: '[]',
      },
    },
  },
})

const setupCheckoutTransactionMocks = () => {
  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      return fn(prismaMock)
    }
    return Promise.all(fn)
  })

  prismaMock.booking.findUnique.mockResolvedValue(null)
  prismaMock.blockedDate.findMany.mockResolvedValue([])
  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({
    id: 'guest-user-1',
    email: 'guest@test.com',
    name: 'Concurrency Guest',
    phone: '555-1000',
    role: 'GUEST',
    isFamilyMember: false,
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  prismaMock.booking.create.mockResolvedValue({
    id: 'booking-concurrency-1',
    guestId: 'guest-user-1',
    checkIn: new Date('2026-08-15'),
    checkOut: new Date('2026-08-18'),
    guestName: 'Concurrency Guest',
    guestEmail: 'guest@test.com',
    guestPhone: '555-1000',
    basePrice: 500 as never,
    addonsTotal: 25 as never,
    depositAmount: 100 as never,
    totalAmount: 525 as never,
    paymentIntentId: 'pi_concurrency_default',
    status: 'CONFIRMED',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    approvedBy: null,
    cancellationReason: null,
    cancellationDetails: null,
    cancelledAt: null,
    rejectionReason: null,
    refundAmount: null,
    refundedAt: null,
    cleaningStatus: 'NOT_REQUIRED',
  } as never)
  prismaMock.addon.findMany.mockResolvedValue([])
  prismaMock.expenseCategory.findFirst.mockResolvedValue({ id: 'income-cat-1' } as never)
  prismaMock.transaction.create.mockResolvedValue({
    id: 'txn-concurrency-1',
    type: 'INCOME',
    categoryId: 'income-cat-1',
    amount: 525 as never,
    date: new Date(),
    description: 'Booking #rency-1',
    vendor: null,
    bookingId: 'booking-concurrency-1',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

describe('booking overlap and webhook concurrency hardening', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    vi.clearAllMocks()

    mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }))
    mockIsDateRangeAvailable.mockReturnValue(true)
    mockRefundCreate.mockResolvedValue({ id: 're_1' })
    mockSendBookingConfirmation.mockResolvedValue(undefined)
    mockSendPaymentReceived.mockResolvedValue(undefined)
    mockSendPaymentFailed.mockResolvedValue(undefined)
    mockSendBookingFailedRefund.mockResolvedValue(undefined)

    stripeEventMock.findUnique.mockResolvedValue(null)
    stripeEventMock.upsert.mockResolvedValue({
      id: 'evt_concurrency_default',
      type: 'checkout.session.completed',
      status: 'processing',
      createdAt: new Date(),
      processedAt: null,
    })
    stripeEventMock.update.mockResolvedValue({
      id: 'evt_concurrency_default',
      type: 'checkout.session.completed',
      status: 'processed',
      createdAt: new Date(),
      processedAt: new Date(),
    })
  })

  it('returns 200 when overlap exclusion constraint rejects create', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(createCheckoutEvent({ eventId: 'evt_overlap_rejected' }))

    prismaMock.booking.findMany.mockResolvedValue([
      {
        checkIn: new Date('2026-08-15'),
        checkOut: new Date('2026-08-18'),
      },
    ] as never)

    const overlapConstraintError = new Prisma.PrismaClientKnownRequestError(
      'Raw query failed: booking_no_date_overlap',
      { code: 'P2010', clientVersion: '7.0.0' }
    )

    prismaMock.booking.create.mockRejectedValue(overlapConstraintError)

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.received).toBe(true)
    expect(json.error).toBe('Booking dates overlap')
    expect(stripeEventMock.update).toHaveBeenCalledWith({
      where: { id: 'evt_overlap_rejected' },
      data: expect.objectContaining({ status: 'processed' }),
    })
  })

  it('allows overlap when another booking is still PENDING', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({ eventId: 'evt_pending_overlap_allowed' })
    )

    prismaMock.booking.findMany.mockResolvedValue([
      {
        checkIn: new Date('2026-08-15'),
        checkOut: new Date('2026-08-18'),
      },
    ] as never)
    mockIsDateRangeAvailable.mockReturnValue(true)

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true })
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['CONFIRMED', 'PENDING'] } },
      select: { checkIn: true, checkOut: true },
    })
    expect(prismaMock.booking.create).toHaveBeenCalledTimes(1)
  })

  it('does not let CANCELLED bookings block a new confirmed booking', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({ eventId: 'evt_cancelled_non_blocking' })
    )

    prismaMock.booking.findMany.mockResolvedValue([])

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true })
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['CONFIRMED', 'PENDING'] } },
      select: { checkIn: true, checkOut: true },
    })
    expect(prismaMock.booking.create).toHaveBeenCalledTimes(1)
  })

  it('skips duplicate webhook delivery when event id is already processed', async () => {
    stripeEventMock.findUnique.mockResolvedValue({
      id: 'evt_duplicate_concurrency',
      type: 'checkout.session.completed',
      status: 'processed',
      createdAt: new Date(),
      processedAt: new Date(),
    })
    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({ eventId: 'evt_duplicate_concurrency' })
    )

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true, skipped: true })
    expect(stripeEventMock.upsert).not.toHaveBeenCalled()
    expect(prismaMock.booking.create).not.toHaveBeenCalled()
  })

  it('refunds amount mismatch and does not create booking', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({
        eventId: 'evt_amount_mismatch_concurrency',
        paymentIntentId: 'pi_amount_mismatch_concurrency',
        totalAmount: '525',
        depositAmount: '100',
        amountTotalCents: 50000,
      })
    )

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true, refunded: true })
    expect(mockRefundCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_amount_mismatch_concurrency',
    })
    expect(prismaMock.booking.create).not.toHaveBeenCalled()
  })
})
