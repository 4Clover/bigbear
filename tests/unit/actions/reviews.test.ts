import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../../__mocks__/prisma'
import { mockSend, resetResendMocks } from '../../__mocks__/resend'
import { createBookingFixture, createHoldBookingFixture } from '../../fixtures/booking.factory'

vi.mock('@/lib/prisma', () => import('../../__mocks__/prisma'))
vi.mock('@/lib/env', () => import('../../__mocks__/env'))
vi.mock('resend', () => import('../../__mocks__/resend'))
vi.mock('@/lib/auth/secure-action', () => ({
  secureAction: (
    _config: unknown,
    handler: (ctx: { session: unknown; data: unknown }) => unknown
  ) => {
    return (input: unknown) => {
      const config = _config as {
        schema?: {
          safeParse: (input: unknown) => {
            success: boolean
            error?: unknown
            data?: unknown
          }
        }
      }
      if (config.schema) {
        const validated = config.schema.safeParse(input)
        if (!validated.success) {
          return Promise.resolve({ success: false, error: 'Invalid input' })
        }
        return handler({
          session: { user: { id: 'owner', role: 'OWNER', email: 'owner@test.com' } },
          data: validated.data,
        })
      }
      return handler({
        session: { user: { id: 'owner', role: 'OWNER', email: 'owner@test.com' } },
        data: input,
      })
    }
  },
}))
vi.mock('@/lib/cache/invalidation', () => ({
  invalidateReviews: vi.fn(),
}))
vi.mock('@/lib/review-token', () => ({
  signReviewToken: vi.fn().mockResolvedValue('mock-review-token'),
  verifyReviewToken: vi.fn(),
}))

const mockDeleteBlob = vi.hoisted(() => vi.fn())

vi.mock('@/lib/blob', () => ({
  deleteBlob: mockDeleteBlob,
}))

const { sendReviewInvite, removeReviewPhoto } = await import('@/actions/reviews')

const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
const futureDate = (daysAhead: number) => new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)

const reviewFixture = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'review-1',
    bookingId: 'booking-1',
    guestName: 'Pat',
    rating: 5,
    body: 'Great stay!',
    photoUrls: ['https://blob.example.com/a.jpg', 'https://blob.example.com/b.jpg'],
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never

describe('Review Actions', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    resetResendMocks()
    vi.clearAllMocks()
    mockDeleteBlob.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // sendReviewInvite eligibility
  // ---------------------------------------------------------------------------

  describe('sendReviewInvite eligibility', () => {
    it.each([
      ['COMPLETED', true],
      ['CONFIRMED', true],
      ['PENDING', false],
      ['CANCELLED', false],
      ['NO_SHOW', false],
    ] as const)('status %s after checkout → invited: %s', async (status, shouldSend) => {
      prismaMock.booking.findUnique.mockResolvedValue(
        createBookingFixture({
          id: 'booking-1',
          status,
          checkIn: pastDate(5),
          checkOut: pastDate(2),
        })
      )

      const result = await sendReviewInvite({ bookingId: 'booking-1' })

      expect(result.success).toBe(shouldSend)
      if (shouldSend) {
        expect(mockSend).toHaveBeenCalledTimes(1)
      } else {
        expect(mockSend).not.toHaveBeenCalled()
      }
    })

    it('rejects a CONFIRMED stay that has not checked out yet', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        createBookingFixture({
          id: 'booking-1',
          status: 'CONFIRMED',
          checkIn: futureDate(3),
          checkOut: futureDate(6),
        })
      )

      const result = await sendReviewInvite({ bookingId: 'booking-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('after checkout')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('rejects an unclaimed PENDING hold', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        createHoldBookingFixture({ id: 'booking-1', checkIn: pastDate(5), checkOut: pastDate(2) })
      )

      const result = await sendReviewInvite({ bookingId: 'booking-1' })

      expect(result.success).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('returns an error when the booking does not exist', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null)

      const result = await sendReviewInvite({ bookingId: 'nope' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Booking not found')
    })
  })

  // ---------------------------------------------------------------------------
  // removeReviewPhoto
  // ---------------------------------------------------------------------------

  describe('removeReviewPhoto', () => {
    it('removes the URL from photoUrls and deletes the blob', async () => {
      prismaMock.review.findUnique.mockResolvedValue(reviewFixture())
      prismaMock.review.update.mockResolvedValue(reviewFixture())

      const result = await removeReviewPhoto({
        reviewId: 'review-1',
        photoUrl: 'https://blob.example.com/a.jpg',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.review.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { photoUrls: ['https://blob.example.com/b.jpg'] },
      })
      expect(mockDeleteBlob).toHaveBeenCalledWith('https://blob.example.com/a.jpg')
    })

    it('succeeds even when blob deletion fails (non-blocking)', async () => {
      prismaMock.review.findUnique.mockResolvedValue(reviewFixture())
      prismaMock.review.update.mockResolvedValue(reviewFixture())
      mockDeleteBlob.mockRejectedValue(new Error('blob storage down'))

      const result = await removeReviewPhoto({
        reviewId: 'review-1',
        photoUrl: 'https://blob.example.com/a.jpg',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.review.update).toHaveBeenCalled()
    })

    it('returns an error when the review does not exist', async () => {
      prismaMock.review.findUnique.mockResolvedValue(null)

      const result = await removeReviewPhoto({
        reviewId: 'nope',
        photoUrl: 'https://blob.example.com/a.jpg',
      })

      expect(result.success).toBe(false)
      expect(prismaMock.review.update).not.toHaveBeenCalled()
      expect(mockDeleteBlob).not.toHaveBeenCalled()
    })

    it('returns an error when the photo is not on the review', async () => {
      prismaMock.review.findUnique.mockResolvedValue(reviewFixture())

      const result = await removeReviewPhoto({
        reviewId: 'review-1',
        photoUrl: 'https://blob.example.com/not-mine.jpg',
      })

      expect(result.success).toBe(false)
      expect(prismaMock.review.update).not.toHaveBeenCalled()
      expect(mockDeleteBlob).not.toHaveBeenCalled()
    })

    it('rejects an invalid photo URL', async () => {
      const result = await removeReviewPhoto({
        reviewId: 'review-1',
        photoUrl: 'not-a-url',
      })

      expect(result.success).toBe(false)
      expect(prismaMock.review.findUnique).not.toHaveBeenCalled()
    })

    it('never mutates the review body or rating', async () => {
      prismaMock.review.findUnique.mockResolvedValue(reviewFixture())
      prismaMock.review.update.mockResolvedValue(reviewFixture())

      await removeReviewPhoto({
        reviewId: 'review-1',
        photoUrl: 'https://blob.example.com/a.jpg',
      })

      const updateArgs = prismaMock.review.update.mock.calls[0]?.[0]
      expect(updateArgs?.data).not.toHaveProperty('body')
      expect(updateArgs?.data).not.toHaveProperty('rating')
      expect(Object.keys(updateArgs?.data ?? {})).toEqual(['photoUrls'])
    })
  })
})
