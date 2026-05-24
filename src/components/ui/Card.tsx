import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`
        bg-card text-card-foreground
        rounded-xl shadow-md overflow-hidden
        border border-border
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`
        px-6 py-4
        border-b border-border
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export const CardContent = ({ children, className = '' }: CardProps) => {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}
