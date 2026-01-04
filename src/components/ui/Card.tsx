import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>{children}</div>
  )
}

export const CardHeader = ({ children, className = '' }: CardProps) => {
  return <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>{children}</div>
}

export const CardContent = ({ children, className = '' }: CardProps) => {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export const CardFooter = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-100 bg-gray-50 ${className}`}>{children}</div>
  )
}
