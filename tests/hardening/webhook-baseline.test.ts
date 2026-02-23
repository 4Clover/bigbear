import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMock } from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/env', () => ({
  env: () => ({
    OWNER_EMAIL: 'owner@test.com',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  }),
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

const createWebhookRequest = () =>
  new Request('http://localhost/api/stripe/webhook', { method: 'POST' }) as never

const setupCheckoutTransactionMocks = () => {
  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      return fn(prismaMock)
    }
    return Promise.all(fn)
  })

  prismaMock.booking.findMany.mockResolvedValue([])
  prismaMock.blockedDate.findMany.mockResolvedValue([])
  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({
    id: 'guest-user-1',
    email: 'guest@test.com',
    name: 'Test Guest',
    phone: '555-1000',
    role: 'GUEST',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  prismaMock.booking.create.mockResolvedValue({
    id: 'booking-1',
    guestId: 'guest-user-1',
    checkIn: new Date('2026-07-10'),
    checkOut: new Date('2026-07-12'),
    guestName: 'Test Guest',
    guestEmail: 'guest@test.com',
    guestPhone: '555-1000',
    basePrice: 500 as never,
    addonsTotal: 25 as never,
    depositAmount: 100 as never,
    totalAmount: 525 as never,
    paymentIntentId: 'pi_test_1',
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
    id: 'txn-1',
    type: 'INCOME',
    categoryId: 'income-cat-1',
    amount: 525 as never,
    date: new Date(),
    description: 'Booking #ing-1',
    vendor: null,
    bookingId: 'booking-1',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

const createCheckoutEvent = (overrides?: {
  amountTotalCents?: number
  addonsJson?: string
  totalAmount?: string
  depositAmount?: string
}) => ({
  id: 'evt_checkout_completed_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      payment_intent: 'pi_test_1',
      amount_total: overrides?.amountTotalCents ?? 62500,
      metadata: {
        guestEmail: 'guest@test.com',
        guestName: 'Test Guest',
        guestPhone: '555-1000',
        checkIn: '2026-07-10',
        checkOut: '2026-07-12',
        basePrice: '500',
        addonsTotal: '25',
        depositAmount: overrides?.depositAmount ?? '100',
        totalAmount: overrides?.totalAmount ?? '525',
        addons: overrides?.addonsJson ?? '[]',
      },
    },
  },
})

describe('webhook baseline behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mockHeaders.mockResolvedValue(new Headers({ 'stripe-signature': 'sig_test' }))
    mockIsDateRangeAvailable.mockReturnValue(true)
    mockSendBookingConfirmation.mockResolvedValue(undefined)
    mockSendPaymentReceived.mockResolvedValue(undefined)
    mockSendPaymentFailed.mockResolvedValue(undefined)
    mockSendBookingFailedRefund.mockResolvedValue(undefined)
  })

  it('handles checkout.session.completed and creates booking with metadata fields', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(createCheckoutEvent())

    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true })
    expect(prismaMock.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestEmail: 'guest@test.com',
        guestName: 'Test Guest',
        basePrice: 500,
        addonsTotal: 25,
        depositAmount: 100,
        totalAmount: 525,
        paymentIntentId: 'pi_test_1',
        status: 'CONFIRMED',
      }),
    })
  })

  it('handles payment_intent.payment_failed without creating booking', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_pi_failed_1',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_failed_1',
          metadata: {},
          last_payment_error: { message: 'Card declined' },
        },
      },
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
    expect(prismaMock.booking.create).not.toHaveBeenCalled()
  })

  it('refunds and skips booking creation on amount mismatch', async () => {
    setupCheckoutTransactionMocks()
    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({
        totalAmount: '525',
        depositAmount: '100',
        amountTotalCents: 50000,
      })
    )
    const response = await POST(createWebhookRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true, refunded: true })
    expect(mockRefundCreate).toHaveBeenCalledWith({ payment_intent: 'pi_test_1' })
    expect(prismaMock.booking.create).not.toHaveBeenCalled()
  })

  it('processes addons with batched lookup and fallback metadata price', async () => {
    setupCheckoutTransactionMocks()
    prismaMock.addon.findMany.mockResolvedValue([
      {
        id: 'addon-1',
        name: 'Firewood',
        description: null,
        price: 15 as never,
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never)
    prismaMock.bookingAddon.create.mockResolvedValue({
      id: 'booking-addon-1',
      bookingId: 'booking-1',
      addonId: 'addon-1',
      quantity: 1,
      price: 15 as never,
    } as never)

    mockConstructEvent.mockReturnValue(
      createCheckoutEvent({
        addonsJson: JSON.stringify([
          { id: 'addon-1', quantity: 1, price: 15 },
          { id: 'addon-2', quantity: 2, price: 10 },
        ]),
      })
    )

    await POST(createWebhookRequest())

    expect(prismaMock.addon.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['addon-1', 'addon-2'] } },
    })
    expect(prismaMock.bookingAddon.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.bookingAddon.create).toHaveBeenNthCalledWith(2, {
      data: {
        bookingId: 'booking-1',
        addonId: 'addon-2',
        quantity: 2,
        price: 10,
      },
    })
  })
})
