import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-forest-100 text-forest-800
    dark:bg-forest-900 dark:text-forest-200
  `,
  success: `
    bg-green-100 text-green-800
    dark:bg-green-900 dark:text-green-200
  `,
  warning: `
    bg-amber-100 text-amber-800
    dark:bg-amber-900 dark:text-amber-200
  `,
  destructive: `
    bg-red-100 text-red-800
    dark:bg-red-900 dark:text-red-200
  `,
  secondary: `
    bg-wood-100 text-wood-800
    dark:bg-wood-900 dark:text-wood-200
  `,
  outline: `
    border border-border text-foreground
    bg-transparent
  `,
}

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5
        rounded-full
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
