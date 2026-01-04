interface FinanceStatsProps {
  income: number
  expenses: number
  netIncome: number
  transactionCount: number
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
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
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(expenses),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Net Income',
      value: formatCurrency(netIncome),
      color: netIncome >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgColor: netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50',
    },
    {
      label: 'Transactions',
      value: transactionCount.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">{stat.label}</p>
          <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
