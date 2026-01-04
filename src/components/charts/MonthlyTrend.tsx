'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/format'

interface MonthlyTrendProps {
  data: { month: string; netIncome: number }[]
}

export const MonthlyTrend = ({ data }: MonthlyTrendProps) => {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="netIncome"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ fill: '#10B981', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
          name="Net Income"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
