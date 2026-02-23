import { formatCurrency } from '@/lib/format'
import { RevenueChart, MonthlyTrend } from '@/components/charts'
import type { AnnualReportData } from '@/actions/reports'

interface AnnualReportProps {
  data: AnnualReportData
}

export const AnnualReport = ({ data }: AnnualReportProps) => {
  const chartData = data.monthlyBreakdown.map((m) => ({
    month: m.month,
    income: m.income,
    expenses: m.expenses,
  }))

  const trendData = data.monthlyBreakdown.map((m) => ({
    month: m.month,
    netIncome: m.net,
  }))

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <p className="text-sm font-medium text-stone-600">Total Income</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {formatCurrency(data.totalIncome)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <p className="text-sm font-medium text-stone-600">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {formatCurrency(data.totalExpenses)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <p className="text-sm font-medium text-stone-600">Net Income</p>
          <p
            className={`mt-2 text-2xl font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {formatCurrency(data.netIncome)}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-lg font-semibold text-stone-950 mb-4">Monthly Revenue</h3>
        <RevenueChart data={chartData} />
      </div>

      {/* Net Income Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-lg font-semibold text-stone-950 mb-4">Net Income Trend</h3>
        <MonthlyTrend data={trendData} />
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-950">Monthly Breakdown</h3>
        </div>
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase">
                Month
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-600 uppercase">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-600 uppercase">
                Expenses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-600 uppercase">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {data.monthlyBreakdown.map((month) => (
              <tr key={month.month} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-sm font-medium text-stone-950">{month.month}</td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600">
                  {formatCurrency(month.income)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  {formatCurrency(month.expenses)}
                </td>
                <td
                  className={`px-6 py-4 text-sm text-right font-medium ${month.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {formatCurrency(month.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-50">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-stone-950">Total</td>
              <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600">
                {formatCurrency(data.totalIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                {formatCurrency(data.totalExpenses)}
              </td>
              <td
                className={`px-6 py-4 text-sm text-right font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatCurrency(data.netIncome)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
