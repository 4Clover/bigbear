import { formatCurrency } from '@/lib/format'
import { CategoryBreakdown } from '@/components/charts'
import type { MonthlyReportData } from '@/actions/reports'

interface MonthlyReportProps {
  data: MonthlyReportData
}

export const MonthlyReport = ({ data }: MonthlyReportProps) => {
  const categoryData = Object.entries(data.byCategory).map(([name, values]) => ({
    name,
    value: values.expenses,
  }))

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Income</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(data.income)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(data.expenses)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Net Income</p>
          <p
            className={`mt-2 text-2xl font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {formatCurrency(data.netIncome)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CategoryBreakdown data={categoryData} title="Expenses by Category" />
      </div>

      {/* Category Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Expenses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data.byCategory).map(([name, values]) => (
              <tr key={name} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{name}</td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600">
                  {values.income > 0 ? formatCurrency(values.income) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  {values.expenses > 0 ? formatCurrency(values.expenses) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-500">
                  {values.transactions.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
