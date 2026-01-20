'use client'

import type { InputHTMLAttributes, Ref } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  ref?: Ref<HTMLInputElement>
}

export const Input = ({ label, error, className = '', id, ref, ...props }: InputProps) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-1"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-lg border
          bg-card text-foreground
          placeholder:text-muted-foreground
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent
          dark:focus:ring-forest-400
          disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-60
          ${error ? 'border-red-500 dark:border-red-400' : 'border-border'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
