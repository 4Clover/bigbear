'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-forest-500 text-white
    hover:bg-forest-600
    focus:ring-forest-500
    dark:bg-forest-600 dark:hover:bg-forest-500
  `,
  secondary: `
    bg-wood-500 text-white
    hover:bg-wood-600
    focus:ring-wood-500
    dark:bg-wood-600 dark:hover:bg-wood-500
  `,
  outline: `
    border-2 border-border text-foreground
    hover:border-forest-500 hover:text-forest-600 hover:bg-forest-50
    focus:ring-forest-500
    dark:hover:border-forest-400 dark:hover:text-forest-400
    dark:hover:bg-forest-950
  `,
  ghost: `
    text-stone-600
    hover:bg-stone-100
    focus:ring-stone-500
    dark:text-stone-400
    dark:hover:bg-stone-800 dark:hover:text-stone-200
  `,
  destructive: `
    bg-red-600 text-white
    hover:bg-red-700
    focus:ring-red-500
    dark:bg-red-700 dark:hover:bg-red-600
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[44px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading, className = '', children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded-lg font-medium
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          dark:focus:ring-offset-stone-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={Boolean(disabled) || Boolean(isLoading)}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
