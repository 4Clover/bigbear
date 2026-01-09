'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { upload } from '@vercel/blob/client'
import type { PutBlobResult } from '@vercel/blob'

interface ProofPhotoUploaderProps {
  onUpload: (urls: string[]) => void
  existingPhotos?: string[]
}

const ProofPhotoUploader = ({ onUpload, existingPhotos = [] }: ProofPhotoUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(existingPhotos)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      setIsUploading(true)

      try {
        const newPhotos: string[] = []

        for (const file of Array.from(files)) {
          const blob: PutBlobResult = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload/maintenance',
          })
          newPhotos.push(blob.url)
        }

        const updated = [...uploadedPhotos, ...newPhotos]
        setUploadedPhotos(updated)
        onUpload(updated)
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload photos')
      } finally {
        setIsUploading(false)
      }
    },
    [uploadedPhotos, onUpload]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removePhoto = (index: number) => {
    const updated = uploadedPhotos.filter((_, i) => i !== index)
    setUploadedPhotos(updated)
    onUpload(updated)
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          transition-colors cursor-pointer
          ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />

        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
          />
        </svg>

        <p className="mt-2 text-sm text-gray-600">
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">PNG, JPG, or WebP up to 10MB</p>
      </div>

      {uploadedPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded photos:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {uploadedPhotos.map((url, index) => (
              <div key={index} className="relative group">
                <Image
                  src={url}
                  alt={`Proof photo ${index + 1}`}
                  width={200}
                  height={96}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removePhoto(index)
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProofPhotoUploader
