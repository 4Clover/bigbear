'use client'

import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full px-3 py-2 pr-10 rounded-lg border
              bg-card text-foreground
              appearance-none
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent
              dark:focus:ring-forest-400
              disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-60
              ${error ? 'border-red-500 dark:border-red-400' : 'border-border'}
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
