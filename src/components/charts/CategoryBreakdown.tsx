'use client'

import dynamic from 'next/dynamic'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'
import { formatCurrency } from '@/lib/format'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

interface CategoryBreakdownProps {
  data: { name: string; value: number }[]
  title?: string
}

function CategoryBreakdownSkeleton({ title }: Readonly<{ title?: string }>) {
  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>}
      <div className="h-75 animate-pulse bg-muted rounded" />
    </div>
  )
}

function CategoryBreakdownInner({ data, title }: Readonly<CategoryBreakdownProps>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  if (data.length === 0) {
    return (
      <div className="h-75 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Theme-aware colors
  const tooltipBg = isDark ? '#292524' : 'white'
  const tooltipBorder = isDark ? '#57534e' : '#e5e7eb'
  const textColor = isDark ? '#f5f5f4' : '#1c1917'

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${String(name)} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              color: textColor,
            }}
            labelStyle={{ color: textColor }}
          />
          <Legend wrapperStyle={{ color: textColor }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-muted-foreground mt-2">Total: {formatCurrency(total)}</p>
    </div>
  )
}

// Export with ssr: false to avoid hydration mismatch with theme
export const CategoryBreakdown = dynamic(
  () => Promise.resolve((props: CategoryBreakdownProps) => <CategoryBreakdownInner {...props} />),
  {
    ssr: false,
    loading: () => <CategoryBreakdownSkeleton />,
  }
)
