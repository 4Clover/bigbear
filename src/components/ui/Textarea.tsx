'use client'

import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full px-3 py-2 rounded-lg border
            bg-card text-foreground
            placeholder:text-muted-foreground
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent
            dark:focus:ring-forest-400
            disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-60
            resize-y min-h-[100px]
            ${error ? 'border-red-500 dark:border-red-400' : 'border-border'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
