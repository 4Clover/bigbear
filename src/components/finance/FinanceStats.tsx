import { formatCurrency } from '@/lib/format'

interface FinanceStatsProps {
  income: number
  expenses: number
  netIncome: number
  transactionCount: number
}

export const FinanceStats = ({
  income,
  expenses,
  netIncome,
  transactionCount,
}: FinanceStatsProps) => {
  const stats = [
    {
      label: 'Total Income',
      value: formatCurrency(income),
      color: 'text-forest-600 dark:text-forest-400',
      bgColor: 'bg-forest-50 dark:bg-forest-900/20',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(expenses),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Net Income',
      value: formatCurrency(netIncome),
      color: netIncome >= 0 ? 'text-forest-600 dark:text-forest-400' : 'text-red-600 dark:text-red-400',
      bgColor: netIncome >= 0 ? 'bg-forest-50 dark:bg-forest-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Transactions',
      value: transactionCount.toString(),
      color: 'text-wood-600 dark:text-wood-400',
      bgColor: 'bg-wood-50 dark:bg-wood-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card rounded-xl shadow-sm border border-border p-6">
          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
