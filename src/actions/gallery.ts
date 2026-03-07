'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'
import { revalidatePath } from 'next/cache'
import { assertOwner } from '@/lib/auth/guards'
import { secureAction } from '@/lib/auth/secure-action'
import { invalidateGallery } from '@/lib/cache/invalidation'
import { GALLERY_CATEGORIES, verifyGalleryUploadToken } from '@/lib/gallery-token'
import { ImageUploader } from '@prisma/client'

const createGalleryImageSchema = z.object({
  url: z.url(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  category: z.enum(GALLERY_CATEGORIES),
  sortOrder: z.number().int().min(0).optional(),
})

const createGuestGalleryImageSchema = z.object({
  token: z.string().min(1),
  url: z.url(),
  caption: z.string().optional(),
})

const updateGalleryImageSchema = z.object({
  id: z.string().min(1),
  alt: z.string().optional(),
  caption: z.string().optional(),
  category: z.enum(GALLERY_CATEGORIES).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
})

const idSchema = z.object({
  id: z.string().min(1),
})

const orderedIdsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
})

const getValidationErrorMessage = (fieldErrors: Record<string, string[] | undefined>) => {
  const firstError = Object.values(fieldErrors).find((errors) => errors && errors.length > 0)
  return firstError?.[0] ?? 'Invalid input'
}

const getFieldErrors = (error: z.ZodError) => {
  const treeified = z.treeifyError(error)
  const properties =
    (treeified as { properties?: Record<string, { errors: string[] } | undefined> }).properties ??
    {}
  const fieldErrors: Record<string, string[] | undefined> = {}
  for (const [key, value] of Object.entries(properties)) {
    fieldErrors[key] = value?.errors
  }
  return fieldErrors
}

const revalidateGalleryPaths = () => {
  revalidatePath('/owner/gallery')
  revalidatePath('/gallery')
}

export const getGalleryImages = async () => {
  await assertOwner()

  return prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
}

export const getPublicGalleryImages = async () => {
  const [guestPhotos, propertyPhotos] = await Promise.all([
    prisma.galleryImage.findMany({
      where: {
        isPublished: true,
        uploadedBy: ImageUploader.GUEST,
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.galleryImage.findMany({
      where: {
        isPublished: true,
        uploadedBy: ImageUploader.OWNER,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  return { guestPhotos, propertyPhotos }
}

export const createGalleryImage = secureAction(
  { roles: 'OWNER', schema: createGalleryImageSchema },
  async ({ data }) => {
    await prisma.galleryImage.create({
      data: {
        ...data,
        uploadedBy: ImageUploader.OWNER,
        isPublished: true,
      },
    })

    invalidateGallery()
    return { success: true }
  }
)

export const createGuestGalleryImage = async (data: {
  token: string
  url: string
  caption?: string
}) => {
  const validated = createGuestGalleryImageSchema.safeParse(data)
  if (!validated.success) {
    const fieldErrors = getFieldErrors(validated.error)
    return { success: false, error: getValidationErrorMessage(fieldErrors) }
  }

  let tokenPayload: Awaited<ReturnType<typeof verifyGalleryUploadToken>>

  try {
    tokenPayload = await verifyGalleryUploadToken(validated.data.token)
  } catch (_error) {
    return { success: false, error: 'Invalid or expired upload token' }
  }

  const existingPhotoCount = await prisma.galleryImage.count({
    where: { bookingId: tokenPayload.bookingId },
  })

  if (existingPhotoCount >= 3) {
    return { success: false, error: 'Photo limit reached' }
  }

  await prisma.galleryImage.create({
    data: {
      url: validated.data.url,
      caption: validated.data.caption,
      uploadedBy: ImageUploader.GUEST,
      isPublished: false,
      bookingId: tokenPayload.bookingId,
    },
  })

  revalidatePath('/owner/gallery')
  return { success: true }
}

export const updateGalleryImage = async (data: {
  id: string
  alt?: string
  caption?: string
  category?: (typeof GALLERY_CATEGORIES)[number]
  sortOrder?: number
  isFeatured?: boolean
  isPublished?: boolean
}) => {
  await assertOwner()

  const validated = updateGalleryImageSchema.safeParse(data)
  if (!validated.success) {
    const fieldErrors = getFieldErrors(validated.error)
    return { success: false, error: getValidationErrorMessage(fieldErrors) }
  }

  const { id, ...updateData } = validated.data

  await prisma.galleryImage.update({
    where: { id },
    data: updateData,
  })

  revalidateGalleryPaths()
  return { success: true }
}

export const deleteGalleryImage = secureAction(
  { roles: 'OWNER', schema: idSchema },
  async ({ data }) => {
    const image = await prisma.galleryImage.findUnique({
      where: { id: data.id },
    })

    if (!image) {
      return { success: false, error: 'Image not found' }
    }

    await deleteBlob(image.url)

    await prisma.galleryImage.delete({
      where: { id: image.id },
    })

    invalidateGallery()
    return { success: true }
  }
)

export const approveGalleryImage = async (id: string) => {
  await assertOwner()

  const validated = idSchema.safeParse({ id })
  if (!validated.success) {
    const fieldErrors = getFieldErrors(validated.error)
    return { success: false, error: getValidationErrorMessage(fieldErrors) }
  }

  await prisma.galleryImage.update({
    where: { id: validated.data.id },
    data: { isPublished: true },
  })

  revalidateGalleryPaths()
  return { success: true }
}

export const rejectGalleryImage = async (id: string) => {
  await assertOwner()

  const validated = idSchema.safeParse({ id })
  if (!validated.success) {
    const fieldErrors = getFieldErrors(validated.error)
    return { success: false, error: getValidationErrorMessage(fieldErrors) }
  }

  const image = await prisma.galleryImage.findUnique({
    where: { id: validated.data.id },
  })

  if (!image) {
    return { success: false, error: 'Image not found' }
  }

  await deleteBlob(image.url)

  await prisma.galleryImage.delete({
    where: { id: image.id },
  })

  revalidateGalleryPaths()
  return { success: true }
}

export const reorderGalleryImages = async (orderedIds: string[]) => {
  await assertOwner()

  const validated = orderedIdsSchema.safeParse({ orderedIds })
  if (!validated.success) {
    const fieldErrors = getFieldErrors(validated.error)
    return { success: false, error: getValidationErrorMessage(fieldErrors) }
  }

  await prisma.$transaction(
    validated.data.orderedIds.map((id, index) =>
      prisma.galleryImage.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidateGalleryPaths()
  return { success: true }
}
