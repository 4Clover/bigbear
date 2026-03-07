'use client'

import Image from 'next/image'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

import {
  approveGalleryImage,
  deleteGalleryImage,
  rejectGalleryImage,
  reorderGalleryImages,
  updateGalleryImage,
} from '@/actions/gallery'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GALLERY_CATEGORIES } from '@/lib/gallery-token'
import type { GalleryCategory } from '@/lib/gallery-token'
import type { DragEndEvent } from '@dnd-kit/core'

export interface GalleryImageWithUploader {
  id: string
  url: string
  alt: string | null
  caption: string | null
  category: GalleryCategory | null
  sortOrder: number
  isFeatured: boolean
  isPublished: boolean
  uploadedBy?: 'OWNER' | 'GUEST'
  bookingId?: string | null
  createdAt: Date
  updatedAt: Date
}

type FilterTab = 'all' | 'property' | 'guest-pending' | 'guest-approved'

interface GalleryManagerProps {
  images: GalleryImageWithUploader[]
}

interface EditFormState {
  alt: string
  caption: string
  category: GalleryCategory
  isFeatured: boolean
}

interface SortableImageCardProps {
  image: GalleryImageWithUploader
  isEditing: boolean
  isPending: boolean
  editForm: EditFormState
  onCardClick: () => void
  onEditFieldChange: (field: keyof EditFormState, value: string | boolean) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}

const SortableImageCard = ({
  image,
  isEditing,
  isPending,
  editForm,
  onCardClick,
  onEditFieldChange,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onReject,
  onDelete,
}: SortableImageCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isGuestPending = image.uploadedBy === 'GUEST' && !image.isPublished
  const imageCategory = image.category ?? 'Uncategorized'
  const uploadedBy = image.uploadedBy ?? 'OWNER'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="cursor-pointer p-3" onClick={onCardClick}>
        <div className="relative mb-3 overflow-hidden rounded-lg bg-muted">
          <Image
            src={image.url}
            alt={image.alt ?? image.caption ?? 'Gallery image'}
            width={640}
            height={360}
            className="h-48 w-full object-cover"
          />
          <button
            type="button"
            className="absolute left-2 top-2 rounded-md bg-black/55 p-1.5 text-white transition hover:bg-black/75"
            aria-label="Drag to reorder image"
            onClick={(event) => {
              event.stopPropagation()
            }}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="truncate text-sm font-medium text-foreground">
            {image.alt ?? 'Untitled image'}
          </p>
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {image.caption ?? 'No caption'}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{imageCategory}</Badge>
            <Badge variant={image.isPublished ? 'success' : 'warning'}>
              {image.isPublished ? 'Published' : 'Unpublished'}
            </Badge>
            <Badge variant={uploadedBy === 'GUEST' ? 'outline' : 'default'}>{uploadedBy}</Badge>
            {image.isFeatured && <Badge variant="default">Featured</Badge>}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex flex-wrap gap-2">
          {isGuestPending && (
            <>
              <Button
                size="sm"
                className="flex-1"
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation()
                  onApprove()
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation()
                  onReject()
                }}
              >
                Reject
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          >
            Delete
          </Button>
        </div>

        {isEditing && (
          <div
            className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-3"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div>
              <label
                htmlFor={`alt-${image.id}`}
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Alt text
              </label>
              <input
                id={`alt-${image.id}`}
                type="text"
                value={editForm.alt}
                onChange={(event) => {
                  onEditFieldChange('alt', event.target.value)
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label
                htmlFor={`caption-${image.id}`}
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Caption
              </label>
              <textarea
                id={`caption-${image.id}`}
                value={editForm.caption}
                onChange={(event) => {
                  onEditFieldChange('caption', event.target.value)
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                rows={3}
              />
            </div>

            <div>
              <label
                htmlFor={`category-${image.id}`}
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Category
              </label>
              <select
                id={`category-${image.id}`}
                value={editForm.category}
                onChange={(event) => {
                  onEditFieldChange('category', event.target.value)
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {GALLERY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={editForm.isFeatured}
                onChange={(event) => {
                  onEditFieldChange('isFeatured', event.target.checked)
                }}
                className="h-4 w-4 rounded border-border"
              />
              Featured image
            </label>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => {
                  onSaveEdit()
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  onCancelEdit()
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'All',
  property: 'Property Photos',
  'guest-pending': 'Guest Pending',
  'guest-approved': 'Guest Approved',
}

export const GalleryManager = ({ images }: GalleryManagerProps) => {
  const [localImages, setLocalImages] = useState(images)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({
    alt: '',
    caption: '',
    category: GALLERY_CATEGORIES[0],
    isFeatured: false,
  })
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filteredImages = useMemo(() => {
    if (activeFilter === 'property') {
      return localImages.filter((image) => (image.uploadedBy ?? 'OWNER') === 'OWNER')
    }

    if (activeFilter === 'guest-pending') {
      return localImages.filter(
        (image) => (image.uploadedBy ?? 'OWNER') === 'GUEST' && !image.isPublished
      )
    }

    if (activeFilter === 'guest-approved') {
      return localImages.filter(
        (image) => (image.uploadedBy ?? 'OWNER') === 'GUEST' && image.isPublished
      )
    }

    return localImages
  }, [activeFilter, localImages])

  const setEditingImage = (image: GalleryImageWithUploader | null) => {
    if (!image) {
      setEditingId(null)
      return
    }

    setEditingId(image.id)
    setEditForm({
      alt: image.alt ?? '',
      caption: image.caption ?? '',
      category: image.category ?? GALLERY_CATEGORIES[0],
      isFeatured: image.isFeatured,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredImages.findIndex((image) => image.id === active.id)
    const newIndex = filteredImages.findIndex((image) => image.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const previousImages = localImages
    const reorderedVisible = arrayMove(filteredImages, oldIndex, newIndex)
    const visibleIds = new Set(filteredImages.map((image) => image.id))
    let visiblePointer = 0

    const reorderedAll = localImages.map((image) => {
      if (!visibleIds.has(image.id)) {
        return image
      }

      const nextImage = reorderedVisible[visiblePointer]
      visiblePointer += 1
      return nextImage ?? image
    })

    setLocalImages(reorderedAll)
    setStatusMessage(null)

    const newIds = reorderedAll.map((image) => image.id)

    startTransition(async () => {
      const result = await reorderGalleryImages(newIds)

      if (!result.success) {
        setLocalImages(previousImages)
        setStatusMessage({ type: 'error', message: result.error ?? 'Failed to reorder images' })
        return
      }

      setStatusMessage({ type: 'success', message: 'Image order updated' })
    })
  }

  const handleApprove = (id: string) => {
    setStatusMessage(null)

    startTransition(async () => {
      const result = await approveGalleryImage(id)

      if (!result.success) {
        setStatusMessage({ type: 'error', message: result.error ?? 'Failed to approve image' })
        return
      }

      setLocalImages((current) =>
        current.map((image) => (image.id === id ? { ...image, isPublished: true } : image))
      )
      setStatusMessage({ type: 'success', message: 'Image approved' })
    })
  }

  const handleReject = (id: string) => {
    setStatusMessage(null)

    startTransition(async () => {
      const result = await rejectGalleryImage(id)

      if (!result.success) {
        setStatusMessage({ type: 'error', message: result.error ?? 'Failed to reject image' })
        return
      }

      setLocalImages((current) => current.filter((image) => image.id !== id))
      if (editingId === id) {
        setEditingId(null)
      }
      setStatusMessage({ type: 'success', message: 'Image rejected and removed' })
    })
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId

    setStatusMessage(null)
    setDeleteConfirmOpen(false)
    setPendingDeleteId(null)

    startTransition(async () => {
      const result = await deleteGalleryImage(id)

      if (!result.success) {
        setStatusMessage({ type: 'error', message: result.error ?? 'Failed to delete image' })
        return
      }

      setLocalImages((current) => current.filter((image) => image.id !== id))
      if (editingId === id) {
        setEditingId(null)
      }
      setStatusMessage({ type: 'success', message: 'Image deleted' })
    })
  }

  const handleSaveEdit = (id: string) => {
    setStatusMessage(null)

    startTransition(async () => {
      const result = await updateGalleryImage({
        id,
        alt: editForm.alt || undefined,
        caption: editForm.caption || undefined,
        category: editForm.category,
        isFeatured: editForm.isFeatured,
      })

      if (!result.success) {
        setStatusMessage({ type: 'error', message: result.error ?? 'Failed to update image' })

        return
      }

      setLocalImages((current) =>
        current.map((image) =>
          image.id === id
            ? {
                ...image,
                alt: editForm.alt || null,
                caption: editForm.caption || null,
                category: editForm.category,
                isFeatured: editForm.isFeatured,
              }
            : image
        )
      )
      setEditingId(null)
      setStatusMessage({ type: 'success', message: 'Image details updated' })
    })
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as FilterTab[]).map((filterKey) => {
          const isActive = activeFilter === filterKey

          return (
            <Button
              key={filterKey}
              size="sm"
              variant={isActive ? 'primary' : 'outline'}
              disabled={isPending}
              onClick={() => {
                setActiveFilter(filterKey)
                setEditingId(null)
              }}
            >
              {FILTER_LABELS[filterKey]}
            </Button>
          )
        })}
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300'
              : 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300'
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      {filteredImages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          No images in this filter yet.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredImages.map((image) => image.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredImages.map((image) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  isEditing={editingId === image.id}
                  isPending={isPending}
                  editForm={editForm}
                  onCardClick={() => {
                    if (editingId === image.id) {
                      setEditingImage(null)
                      return
                    }

                    setEditingImage(image)
                  }}
                  onEditFieldChange={(field, value) => {
                    setEditForm((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }}
                  onSaveEdit={() => {
                    handleSaveEdit(image.id)
                  }}
                  onCancelEdit={() => {
                    setEditingImage(null)
                  }}
                  onApprove={() => {
                    handleApprove(image.id)
                  }}
                  onReject={() => {
                    handleReject(image.id)
                  }}
                  onDelete={() => {
                    handleDelete(image.id)
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isPending}
      />

    </>
  )
}
