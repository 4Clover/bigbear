'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useState, useTransition, useEffect, useRef } from 'react'
import { Loader2, X } from 'lucide-react'
import { Input } from './Input'

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label: string
  defaultValue?: string
  placeholder?: string
  onSubmit: (value: string) => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  defaultValue = '',
  placeholder,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  isLoading = false,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset value when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(defaultValue)
      // Focus after a short delay to allow dialog to render
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
      return () => { clearTimeout(timer) }
    }
    return undefined
  }, [open, defaultValue])

  const isWorking = isLoading || isPending

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      await onSubmit(value)
      onOpenChange(false)
    })
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={isWorking ? undefined : onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] dark:border-stone-700 dark:bg-stone-900">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <DialogPrimitive.Title className="text-lg font-bold text-stone-950 dark:text-stone-50">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-stone-700 dark:text-stone-400">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <div className="py-4">
              <label className="mb-2 block text-sm font-medium text-stone-950 dark:text-stone-50">
                {label}
              </label>
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => { setValue(e.target.value) }}
                placeholder={placeholder}
                disabled={isWorking}
                className="w-full"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  disabled={isWorking}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent px-4 py-2 font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0 dark:text-stone-400 dark:hover:bg-stone-800 dark:focus:ring-offset-stone-900"
                >
                  {cancelLabel}
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={isWorking}
                className="inline-flex items-center justify-center rounded-lg bg-forest-500 px-4 py-2 font-medium text-white transition-colors hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus:ring-offset-stone-900"
              >
                {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </button>
            </div>

            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-stone-100 dark:ring-offset-stone-950 dark:focus:ring-stone-300 dark:data-[state=open]:bg-stone-800"
              disabled={isWorking}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
