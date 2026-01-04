'use client'

import type { ExpenseCategory } from '@prisma/client'

interface CategorySelectProps {
  categories: ExpenseCategory[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export const CategorySelect = ({
  categories,
  value,
  onChange,
  className = '',
}: CategorySelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        px-3 py-2 border border-gray-300 rounded-lg text-sm
        focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
        bg-white
        ${className}
      `}
    >
      <option value="">Select category...</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  )
}
