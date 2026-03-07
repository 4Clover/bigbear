import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../../__mocks__/prisma'

vi.mock('@/lib/prisma', () => import('../../__mocks__/prisma'))
vi.mock('@/lib/auth/guards', () => ({
  assertOwner: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/blob', () => ({
  deleteBlob: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/cache/invalidation', () => ({
  invalidateGallery: vi.fn(),
  CacheTags: { gallery: () => 'gallery' },
}))
vi.mock('@/lib/auth/secure-action', () => ({
  secureAction: (_config: unknown, handler: (ctx: { session: unknown; data: unknown }) => unknown) => {
    return (input: unknown) => {
      const config = _config as { schema?: { safeParse: (input: unknown) => { success: boolean; error?: unknown; data?: unknown } } }
      if (config.schema) {
        const validated = config.schema.safeParse(input)
        if (!validated.success) {
          const error = validated.error as { errors?: unknown[] }
          return Promise.resolve({ success: false, error: error?.errors?.[0] ?? 'Invalid input' })
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
vi.mock('@/lib/gallery-token', () => ({
  verifyGalleryUploadToken: vi.fn().mockResolvedValue({
    bookingId: 'booking-123',
    guestName: 'Jane',
    guestEmail: 'jane@test.com',
  }),
  GALLERY_CATEGORIES: [
    'Exterior',
    'Bedrooms',
    'Kitchen',
    'Bathrooms',
    'Living Areas',
    'Outdoors',
    'Amenities',
  ],
}))

const {
  createGalleryImage,
  createGuestGalleryImage,
  deleteGalleryImage,
  approveGalleryImage,
  rejectGalleryImage,
  reorderGalleryImages,
  getPublicGalleryImages,
} = await import('@/actions/gallery')

const createGalleryImageFixture = (overrides?: Record<string, unknown>) =>
  ({
    id: 'img-1',
    url: 'https://example.com/photo.jpg',
    alt: null,
    caption: null,
    category: 'Exterior',
    sortOrder: 0,
    isFeatured: false,
    isPublished: true,
    uploadedBy: 'OWNER',
    bookingId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as any

describe('Gallery Actions', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  describe('createGalleryImage', () => {
    it('should create image with uploadedBy OWNER and isPublished true', async () => {
      prismaMock.galleryImage.create.mockResolvedValue(createGalleryImageFixture())

      const result = await createGalleryImage({
        url: 'https://example.com/photo.jpg',
        category: 'Exterior',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.galleryImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'https://example.com/photo.jpg',
          category: 'Exterior',
          uploadedBy: 'OWNER',
          isPublished: true,
        }),
      })
    })

    it('should return error for invalid url', async () => {
      const result = await createGalleryImage({
        url: 'not-a-url',
        category: 'Exterior',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(prismaMock.galleryImage.create).not.toHaveBeenCalled()
    })

    it('should invalidate gallery cache after creation', async () => {
      const { invalidateGallery } = await import('@/lib/cache/invalidation')
      prismaMock.galleryImage.create.mockResolvedValue(createGalleryImageFixture())

      await createGalleryImage({
        url: 'https://example.com/photo.jpg',
        category: 'Exterior',
      })

      expect(invalidateGallery).toHaveBeenCalled()
    })
  })

  describe('createGuestGalleryImage', () => {
    it('should call verifyGalleryUploadToken with provided token', async () => {
      const { verifyGalleryUploadToken } = await import('@/lib/gallery-token')
      prismaMock.galleryImage.count.mockResolvedValue(0)
      prismaMock.galleryImage.create.mockResolvedValue(
        createGalleryImageFixture({ uploadedBy: 'GUEST', isPublished: false })
      )

      await createGuestGalleryImage({
        token: 'valid-token',
        url: 'https://example.com/guest-photo.jpg',
      })

      expect(verifyGalleryUploadToken).toHaveBeenCalledWith('valid-token')
    })

    it('should create image with uploadedBy GUEST and isPublished false', async () => {
      prismaMock.galleryImage.count.mockResolvedValue(0)
      prismaMock.galleryImage.create.mockResolvedValue(
        createGalleryImageFixture({ uploadedBy: 'GUEST', isPublished: false })
      )

      const result = await createGuestGalleryImage({
        token: 'valid-token',
        url: 'https://example.com/guest-photo.jpg',
      })

      expect(result.success).toBe(true)
      expect(prismaMock.galleryImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploadedBy: 'GUEST',
          isPublished: false,
          bookingId: 'booking-123',
        }),
      })
    })

    it('should return error when photo limit reached (3 photos)', async () => {
      prismaMock.galleryImage.count.mockResolvedValue(3)

      const result = await createGuestGalleryImage({
        token: 'valid-token',
        url: 'https://example.com/guest-photo.jpg',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Photo limit reached')
      expect(prismaMock.galleryImage.create).not.toHaveBeenCalled()
    })

    it('should return error for invalid token', async () => {
      const { verifyGalleryUploadToken } = await import('@/lib/gallery-token')
      vi.mocked(verifyGalleryUploadToken).mockRejectedValueOnce(new Error('invalid'))

      const result = await createGuestGalleryImage({
        token: 'bad-token',
        url: 'https://example.com/guest-photo.jpg',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or expired upload token')
    })
  })

  describe('deleteGalleryImage', () => {
    it('should call deleteBlob before prisma.delete', async () => {
      const { deleteBlob } = await import('@/lib/blob')
      const image = createGalleryImageFixture()
      prismaMock.galleryImage.findUnique.mockResolvedValue(image)
      prismaMock.galleryImage.delete.mockResolvedValue(image)

      const result = await deleteGalleryImage({ id: 'img-1' })

      expect(result.success).toBe(true)
      expect(deleteBlob).toHaveBeenCalledWith(image.url)
      expect(prismaMock.galleryImage.delete).toHaveBeenCalledWith({
        where: { id: image.id },
      })
      const deleteBlobOrder = vi.mocked(deleteBlob).mock.invocationCallOrder[0]!
      const prismaDeleteOrder = prismaMock.galleryImage.delete.mock.invocationCallOrder[0]!
      expect(deleteBlobOrder).toBeLessThan(prismaDeleteOrder)
    })

    it('should return error when image not found', async () => {
      prismaMock.galleryImage.findUnique.mockResolvedValue(null)

      const result = await deleteGalleryImage({ id: 'nonexistent' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Image not found')
    })
  })

  describe('approveGalleryImage', () => {
    it('should call assertOwner', async () => {
      const { assertOwner } = await import('@/lib/auth/guards')
      prismaMock.galleryImage.update.mockResolvedValue(
        createGalleryImageFixture({ isPublished: true })
      )

      await approveGalleryImage('img-1')

      expect(assertOwner).toHaveBeenCalled()
    })

    it('should update isPublished to true', async () => {
      prismaMock.galleryImage.update.mockResolvedValue(
        createGalleryImageFixture({ isPublished: true })
      )

      const result = await approveGalleryImage('img-1')

      expect(result.success).toBe(true)
      expect(prismaMock.galleryImage.update).toHaveBeenCalledWith({
        where: { id: 'img-1' },
        data: { isPublished: true },
      })
    })
  })

  describe('rejectGalleryImage', () => {
    it('should call assertOwner and deleteBlob before prisma.delete', async () => {
      const { assertOwner } = await import('@/lib/auth/guards')
      const { deleteBlob } = await import('@/lib/blob')
      const image = createGalleryImageFixture({ uploadedBy: 'GUEST', isPublished: false })
      prismaMock.galleryImage.findUnique.mockResolvedValue(image)
      prismaMock.galleryImage.delete.mockResolvedValue(image)

      const result = await rejectGalleryImage('img-1')

      expect(assertOwner).toHaveBeenCalled()
      expect(deleteBlob).toHaveBeenCalledWith(image.url)
      expect(prismaMock.galleryImage.delete).toHaveBeenCalledWith({
        where: { id: image.id },
      })
      expect(result.success).toBe(true)
    })

    it('should return error when image not found', async () => {
      prismaMock.galleryImage.findUnique.mockResolvedValue(null)

      const result = await rejectGalleryImage('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Image not found')
    })
  })

  describe('reorderGalleryImages', () => {
    it('should call assertOwner', async () => {
      const { assertOwner } = await import('@/lib/auth/guards')
      prismaMock.$transaction.mockResolvedValue([])

      await reorderGalleryImages(['img-1', 'img-2'])

      expect(assertOwner).toHaveBeenCalled()
    })

    it('should call $transaction with updates', async () => {
      prismaMock.$transaction.mockResolvedValue([])

      const result = await reorderGalleryImages(['img-1', 'img-2', 'img-3'])

      expect(result.success).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should return error for empty array', async () => {
      const result = await reorderGalleryImages([])

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('getPublicGalleryImages', () => {
    it('should NOT call assertOwner', async () => {
      const { assertOwner } = await import('@/lib/auth/guards')
      vi.mocked(assertOwner).mockClear()
      prismaMock.galleryImage.findMany.mockResolvedValue([])

      await getPublicGalleryImages()

      expect(assertOwner).not.toHaveBeenCalled()
    })

    it('should return guestPhotos and propertyPhotos', async () => {
      const guestPhoto = createGalleryImageFixture({
        id: 'guest-1',
        uploadedBy: 'GUEST',
        isPublished: true,
      })
      const propertyPhoto = createGalleryImageFixture({
        id: 'prop-1',
        uploadedBy: 'OWNER',
        isPublished: true,
      })

      prismaMock.galleryImage.findMany
        .mockResolvedValueOnce([guestPhoto])
        .mockResolvedValueOnce([propertyPhoto])

      const result = await getPublicGalleryImages()

      expect(result).toEqual({
        guestPhotos: [guestPhoto],
        propertyPhotos: [propertyPhoto],
      })
    })
  })
})
