'use client'

import dynamic from 'next/dynamic'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import { formatCurrency } from '@/lib/format'

interface RevenueChartProps {
  data: { month: string; income: number; expenses: number }[]
}

function RevenueChartSkeleton() {
  return <div className="h-[300px] animate-pulse bg-muted rounded" />
}

function RevenueChartInner({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Theme-aware colors
  const gridColor = isDark ? '#57534e' : '#e5e7eb'
  const tickColor = isDark ? '#a8a29e' : '#6b7280'
  const tooltipBg = isDark ? '#292524' : 'white'
  const tooltipBorder = isDark ? '#57534e' : '#e5e7eb'
  const textColor = isDark ? '#f5f5f4' : '#1c1917'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
        <YAxis
          tick={{ fill: tickColor, fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            color: textColor,
          }}
          labelStyle={{ color: textColor }}
        />
        <Legend wrapperStyle={{ color: textColor }} />
        <Bar dataKey="income" fill="#10B981" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Export with ssr: false to avoid hydration mismatch with theme
export const RevenueChart = dynamic(
  () => Promise.resolve((props: RevenueChartProps) => <RevenueChartInner {...props} />),
  {
    ssr: false,
    loading: () => <RevenueChartSkeleton />,
  }
)
